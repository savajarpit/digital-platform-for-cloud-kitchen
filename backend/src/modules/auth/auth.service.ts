import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../users/users.repository';
import { HashUtil } from '../../common/utils/hash.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens } from './types/auth-tokens.type';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
