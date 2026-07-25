import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UsersRepository } from '../users/users.repository';
import { HashUtil } from '../../common/utils/hash.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens } from './types/auth-tokens.type';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { WelcomeEmailJob } from '../../shared-modules/queue/processors/mail.processor';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await HashUtil.hash(dto.password);
    const user = await this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      tenant: {
        create: {
          name: `${dto.firstName}'s Workspace`,
          slug: `${dto.email.split('@')[0]}-${Date.now()}`,
        },
      },
    });

    const welcomeJob: WelcomeEmailJob = {
      email: user.email,
      firstName: user.firstName,
    };
    await this.mailQueue.add('send-welcome', welcomeJob, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
      jobId: `send-welcome:${user.id}`,
    });

    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await HashUtil.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
  }

  async refreshTokens(userId: string): Promise<AuthTokens> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email, user.role, user.tenantId);
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
