---
name: redis
description: >
  Read for any Redis task: caching, key naming, TTL strategy, session storage,
  rate limiting storage, OTP/token storage, or RedisService setup.
  Read general-guidelines.md → nestjs.md → this file.
  Official docs: https://redis.io/docs/
  NestJS caching: https://docs.nestjs.com/techniques/caching
---

# Redis Skill

## PROJECT DECISIONS

```
Client:       ioredis (direct)
Location:     src/shared-modules/cache/
Service:      RedisService — @Global(), inject anywhere
Purpose:      Caching, refresh token storage, OTP/codes, rate limiting, sessions
```

## INSTALL

```bash
npm install ioredis
```

## REDIS SERVICE

```typescript
// src/shared-modules/cache/redis.service.ts
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get('redis.host', 'localhost'),
      port: this.config.get('redis.port', 6379),
      password: this.config.get('redis.password'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  onModuleDestroy() { this.client.quit(); }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) await this.client.set(key, data, 'EX', ttlSeconds);
    else await this.client.set(key, data);
  }
  async del(key: string): Promise<void> { await this.client.del(key); }
  async exists(key: string): Promise<boolean> { return (await this.client.exists(key)) === 1; }
  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(...keys);
  }
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds);
    return count;
  }
}

// redis.module.ts
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
```

## KEY NAMING — always namespaced

```
user:{id}                    user object
user:{id}:profile            user profile
token:refresh:{userId}       refresh token
otp:email:{userId}           email OTP
rate:login:ip:{ip}           login rate limit
session:{sessionId}          session data
product:list:{tenantId}      product list cache
blacklist:{token}            revoked token
```

## TTL STRATEGY

```
OTP / verification codes:   300      (5 min)
Password reset tokens:      900      (15 min)
Access token cache:         900      (15 min — match JWT expiry)
Refresh tokens:             604800   (7 days)
User/profile cache:         300      (5 min)
List/query cache:           60       (1 min)
Tenant settings:            3600     (1 hour)
Sessions:                   86400    (24 hours)
Rate limit window:          60       (1 min)
```

## COMMON PATTERNS

```typescript
// Cache-aside
async findOne(id: string) {
  const cached = await this.redis.get<User>(`user:${id}`);
  if (cached) return cached;
  const user = await this.usersRepo.findById(id);
  if (!user) throw new NotFoundException();
  await this.redis.set(`user:${id}`, user, 300);
  return user;
}
// Always invalidate on write
async update(id: string, dto: UpdateUserDto) {
  const user = await this.usersRepo.update(id, dto);
  await this.redis.del(`user:${id}`);
  return user;
}

// OTP storage
async storeOtp(userId: string, otp: string) {
  await this.redis.set(`otp:email:${userId}`, otp, 300);
}
async verifyOtp(userId: string, code: string): Promise<boolean> {
  const stored = await this.redis.get<string>(`otp:email:${userId}`);
  if (!stored || stored !== code) return false;
  await this.redis.del(`otp:email:${userId}`); // one-time use
  return true;
}

// Token blacklist (on logout)
async blacklistToken(token: string, ttl: number) {
  await this.redis.set(`blacklist:${token}`, '1', ttl);
}
async isBlacklisted(token: string): Promise<boolean> {
  return this.redis.exists(`blacklist:${token}`);
}

// Rate limiting
async checkRateLimit(key: string, limit: number, windowSec: number) {
  const count = await this.redis.increment(key, windowSec);
  if (count > limit) throw new TooManyRequestsException();
}
```

## RULES

```
✅ Namespaced keys always
✅ Always set TTL
✅ Invalidate cache on update/delete
✅ Inject RedisService — never create Redis client inline
❌ Never cache without TTL
❌ Never store plain tokens/passwords (use hashed or opaque references)
❌ Never use generic keys like 'user' or 'data'
```

## ENV

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## KEY DOCS

```
ioredis:        https://github.com/redis/ioredis
Redis commands: https://redis.io/docs/latest/commands/
NestJS caching: https://docs.nestjs.com/techniques/caching
```