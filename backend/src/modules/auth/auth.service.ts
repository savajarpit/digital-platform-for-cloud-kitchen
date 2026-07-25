import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UsersRepository } from '../users/users.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../../shared-modules/cache/redis.service';
import { HashUtil } from '../../common/utils/hash.util';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokens } from './types/auth-tokens.type';
import { RegisterResult } from './types/register-result.type';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Role } from '../../generated/prisma';
import {
  ResetPasswordEmailJob,
  WelcomeEmailJob,
} from '../../shared-modules/queue/processors/mail.processor';

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_SECONDS = 900; // 15 minutes
const QUEUE_ENQUEUE_TIMEOUT_MS = 3000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  async register(
    dto: RegisterDto,
    tenantId: string | undefined,
  ): Promise<RegisterResult> {
    if (!tenantId) {
      throw new NotFoundException('No tenant context for this request');
    }

    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await HashUtil.hash(dto.password);
    const user = await this.usersRepo.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: Role.CUSTOMER,
      tenant: { connect: { id: tenantId } },
    });

    try {
      await this.issueAndSendOtp(tenantId, user.id, user.email, user.firstName, user.phone);
    } catch {
      // The user has no way to verify without a delivered code — don't leave
      // an unverifiable, unusable account behind.
      await this.usersRepo.hardDelete(user.id);
      throw new ConflictException(
        'Could not send a verification code — please try again in a moment.',
      );
    }

    return { userId: user.id, verificationRequired: true };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const user = await this.usersRepo.findById(dto.userId);
    if (!user) throw new UnauthorizedException('Invalid verification request');
    if (user.verifiedAt) throw new ConflictException('Account already verified');

    const attemptsKey = this.otpAttemptsKey(user.tenantId, user.id);
    const attempts = (await this.redis.get<number>(attemptsKey)) ?? 0;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException(
        'Too many incorrect attempts — request a new code.',
      );
    }

    const stored = await this.redis.get<string>(this.otpKey(user.tenantId, user.id));
    if (!stored) {
      throw new UnauthorizedException('Code expired — request a new one.');
    }

    const valid = await HashUtil.compare(dto.code, stored);
    if (!valid) {
      await this.redis.increment(attemptsKey, OTP_TTL_SECONDS);
      throw new UnauthorizedException('Incorrect code.');
    }

    await this.redis.del(this.otpKey(user.tenantId, user.id));
    await this.redis.del(attemptsKey);
    const verifiedUser = await this.usersRepo.update(user.id, {
      verifiedAt: new Date(),
    });

    const welcomeJob: WelcomeEmailJob = {
      email: verifiedUser.email,
      firstName: verifiedUser.firstName,
    };
    await withTimeout(
      this.mailQueue.add('send-welcome', welcomeJob, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `send-welcome:${verifiedUser.id}`,
      }),
      QUEUE_ENQUEUE_TIMEOUT_MS,
    );

    return this.generateTokens(
      verifiedUser.id,
      verifiedUser.email,
      verifiedUser.role,
      verifiedUser.tenantId,
    );
  }

  async resendOtp(dto: ResendOtpDto): Promise<void> {
    const user = await this.usersRepo.findById(dto.userId);
    if (!user) throw new NotFoundException('Invalid verification request');
    if (user.verifiedAt) throw new ConflictException('Account already verified');

    await this.issueAndSendOtp(user.tenantId, user.id, user.email, user.firstName, user.phone);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await HashUtil.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    if (!user.verifiedAt) {
      throw new ForbiddenException({
        message: 'Please verify your account before logging in.',
        code: 'ACCOUNT_NOT_VERIFIED',
        userId: user.id,
      });
    }

    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepo.findByEmail(dto.email);
    // Always behave the same whether the email exists or not — don't let
    // this endpoint be used to enumerate registered accounts.
    if (!user) return;

    const token = CryptoUtil.generateToken(32);
    await this.redis.set(
      `password-reset:${token}`,
      { userId: user.id },
      PASSWORD_RESET_TTL_SECONDS,
    );

    const resetUrl = `${this.config.get<string>('app.frontendUrl')}/reset-password?token=${token}`;
    const job: ResetPasswordEmailJob = { email: user.email, resetUrl };
    await withTimeout(
      this.mailQueue.add('send-reset-password', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `send-reset-password:${user.id}:${token}`,
      }),
      QUEUE_ENQUEUE_TIMEOUT_MS,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const key = `password-reset:${dto.token}`;
    const stored = await this.redis.get<{ userId: string }>(key);
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }

    const passwordHash = await HashUtil.hash(dto.newPassword);
    await this.usersRepo.update(stored.userId, { passwordHash });
    await this.redis.del(key);
  }

  async refreshTokens(userId: string): Promise<AuthTokens> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  private async issueAndSendOtp(
    tenantId: string,
    userId: string,
    email: string,
    firstName: string,
    phone: string | null,
  ): Promise<void> {
    const otp = CryptoUtil.generateOtp(6);
    const hashedOtp = await HashUtil.hash(otp);

    await this.redis.set(this.otpKey(tenantId, userId), hashedOtp, OTP_TTL_SECONDS);
    await this.redis.del(this.otpAttemptsKey(tenantId, userId));

    const settings = await this.settingsRepo.findNotificationSettings(tenantId);
    await this.notificationsService.sendOtp(settings, {
      recipientEmail: email,
      recipientName: firstName,
      recipientWhatsAppNumber: phone ?? undefined,
      otp,
    });
  }

  private otpKey(tenantId: string, userId: string): string {
    return `otp:${tenantId}:${userId}`;
  }

  private otpAttemptsKey(tenantId: string, userId: string): string {
    return `otp-attempts:${tenantId}:${userId}`;
  }

  private generateTokens(
    userId: string,
    email: string,
    role: string,
    tenantId?: string,
  ): AuthTokens {
    const payload: JwtPayload = { sub: userId, email, role, tenantId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpiry') ?? '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiry') ?? '7d',
      },
    );

    return { accessToken, refreshToken };
  }
}
