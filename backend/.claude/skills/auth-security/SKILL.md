---
name: auth-security
description: >
  Read for any auth or security task: JWT setup, refresh tokens,
  bcrypt hashing, guards, CORS, helmet, rate limiting, CSRF,
  encryption, or security hardening.
  Read general-guidelines.md → nestjs.md → this file.
  NestJS auth: https://docs.nestjs.com/security/authentication
  NestJS security: https://docs.nestjs.com/security/helmet
---

# Auth & Security Skill

## PROJECT DECISIONS

```
Auth method:      JWT — access token (15m) + refresh token (7d)
Token rotation:   Refresh tokens rotate on each use (invalidate old, issue new)
Password hashing: bcryptjs with saltRounds = 12
Guards:           Global JwtAuthGuard — all routes protected by default
Public routes:    @Public() decorator to opt-out
Roles:            @Roles() decorator + RolesGuard (global)
Token storage:    Refresh tokens stored in DB (RefreshToken table)
Blacklisting:     Revoked tokens stored in Redis
```

---

## INSTALL

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcryptjs
npm install @types/passport-jwt @types/bcryptjs --save-dev
```

---

## JWT STRATEGY

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  // This object becomes request.user — keep it minimal
  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}

// src/common/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}
```

---

## TOKEN GENERATION

```typescript
// In auth.service.ts
private generateTokens(userId: string, email: string, role: string, tenantId: string) {
  const payload: JwtPayload = { sub: userId, email, role, tenantId };
  return {
    accessToken: this.jwtService.sign(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: '15m',
    }),
    refreshToken: this.jwtService.sign(
      { sub: userId },
      { secret: this.config.get('jwt.refreshSecret'), expiresIn: '7d' },
    ),
  };
}

// Token rotation on refresh — always:
// 1. Validate old refresh token exists in DB
// 2. Delete old refresh token from DB
// 3. Issue new access + refresh token pair
// 4. Store new refresh token in DB
```

---

## PASSWORD HASHING

```typescript
// src/common/utils/hash.util.ts
import * as bcrypt from 'bcryptjs';

export class HashUtil {
  static async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);        // 12 rounds — secure, not too slow
  }

  static async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}

// Usage in auth.service.ts:
const passwordHash = await HashUtil.hash(dto.password);
const valid = await HashUtil.compare(dto.password, user.passwordHash);
if (!valid) throw new UnauthorizedException('Invalid credentials');
```

---

## SECURITY HEADERS (main.ts)

```typescript
// helmet — adds 11 security headers
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — whitelist only known origins
app.enableCors({
  origin: (origin, callback) => {
    const allowed = config.get<string[]>('app.allowedOrigins');
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
});
```

---

## RATE LIMITING

```typescript
// Global (app.module.ts)
ThrottlerModule.forRootAsync({
  useFactory: () => ([
    { name: 'short',  ttl: 1_000,     limit: 10  },
    { name: 'medium', ttl: 60_000,    limit: 100 },
    { name: 'long',   ttl: 3_600_000, limit: 1000 },
  ]),
}),
{ provide: APP_GUARD, useClass: ThrottlerGuard },

// Strict on auth endpoints
@Throttle({ medium: { limit: 5, ttl: 60_000 } })  // 5 attempts/min
@Post('login')
```

---

## ENCRYPTION UTILITY

```typescript
// src/common/utils/crypto.util.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';

  // Encrypt sensitive data at rest (PII, API keys etc.)
  static encrypt(text: string, secretKey: string): string {
    const key = createHash('sha256').update(secretKey).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  static decrypt(encrypted: string, secretKey: string): string {
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    const key = createHash('sha256').update(secretKey).digest();
    const decipher = createDecipheriv(this.ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
  }

  // Generate secure random tokens (OTPs, reset links)
  static generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  static generateOtp(digits = 6): string {
    return String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
  }
}
```

---

## SECURITY RULES

```
Passwords:
✅ Hash with bcrypt saltRounds=12 always
✅ Never store plain text passwords
✅ Never log passwords even in dev
✅ Compare with bcrypt.compare — never string equality

Tokens:
✅ Short-lived access tokens (15 min)
✅ Rotate refresh tokens on every use
✅ Store refresh tokens hashed in DB
✅ Blacklist revoked tokens in Redis
✅ JWT_ACCESS_SECRET min 32 chars
✅ JWT_REFRESH_SECRET min 32 chars — different from access secret

Response:
✅ @Exclude() on passwordHash in all response DTOs
✅ Never include internal IDs, stack traces in prod responses
✅ Use ClassSerializerInterceptor globally

General:
✅ Helmet on every project
✅ CORS whitelist — never '*' in production
✅ Rate limit auth endpoints strictly (5/min)
✅ All secrets from ConfigService — never hardcoded
✅ Validate env vars at startup with Joi schema

❌ Never use MD5 or SHA for passwords
❌ Never log JWTs, passwords, or card numbers
❌ Never '*' as CORS origin in production
❌ Never disable rate limiting globally
```

---

## ENV VARIABLES

```bash
JWT_ACCESS_SECRET=minimum-32-character-secret-here-change-me
JWT_REFRESH_SECRET=different-minimum-32-character-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=32-char-key-for-aes-encryption-here
```

---

## KEY DOCS

```
NestJS auth:        https://docs.nestjs.com/security/authentication
NestJS authorization: https://docs.nestjs.com/security/authorization
NestJS helmet:      https://docs.nestjs.com/security/helmet
NestJS CORS:        https://docs.nestjs.com/security/cors
NestJS rate limit:  https://docs.nestjs.com/security/rate-limiting
NestJS encryption:  https://docs.nestjs.com/security/encryption-and-hashing
NestJS CSRF:        https://docs.nestjs.com/security/csrf
```