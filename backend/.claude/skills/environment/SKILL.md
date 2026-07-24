---
name: environment
description: >
  Read for any env variable, configuration, or secrets management task.
  Config pattern, validation schema, per-environment setup.
  Read general-guidelines.md → this file.
  NestJS config: https://docs.nestjs.com/techniques/configuration
---

# Environment & Config Skill

## RULES (non-negotiable)

```
✅ Always access config via ConfigService — never process.env.X directly
✅ Always validate all env vars at startup with Joi
✅ App must fail fast if required env vars are missing
✅ .env is never committed — .env.example is always committed and kept current
✅ Different .env per environment: .env.development, .env.test, .env.production
✅ Secrets min length enforced in Joi schema (JWT secrets min 32 chars)

❌ Never process.env.ANYTHING in business code
❌ Never commit .env, .env.production, .env.staging
❌ Never hardcode any URL, secret, or key in source code
```

---

## CONFIG MODULE SETUP (app.module.ts)

```typescript
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import stripeConfig from './config/stripe.config';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
  load: [appConfig, jwtConfig, databaseConfig, redisConfig, stripeConfig],
  validationSchema: Joi.object({
    NODE_ENV:             Joi.string().valid('development','production','test').required(),
    PORT:                 Joi.number().default(3000),

    // Database
    DATABASE_URL:         Joi.string().when('DB_DRIVER', { is: 'prisma', then: Joi.required() }),
    MONGO_URI:            Joi.string().when('DB_DRIVER', { is: 'mongoose', then: Joi.required() }),
    DB_DRIVER:            Joi.string().valid('prisma','mongoose').default('prisma'),

    // JWT
    JWT_ACCESS_SECRET:    Joi.string().min(32).required(),
    JWT_REFRESH_SECRET:   Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRY:    Joi.string().default('15m'),
    JWT_REFRESH_EXPIRY:   Joi.string().default('7d'),

    // Redis
    REDIS_HOST:           Joi.string().default('localhost'),
    REDIS_PORT:           Joi.number().default(6379),
    REDIS_PASSWORD:       Joi.string().allow('').default(''),

    // CORS
    ALLOWED_ORIGINS:      Joi.string().default('http://localhost:3000'),

    // Stripe (optional — only required when using payments)
    STRIPE_SECRET_KEY:    Joi.string().optional(),
    STRIPE_WEBHOOK_SECRET:Joi.string().optional(),

    // Encryption
    ENCRYPTION_KEY:       Joi.string().min(32).optional(),
  }),
  validationOptions: {
    abortEarly: true,     // stop at first error for clear messages
    allowUnknown: false,  // reject unknown env vars
  },
}),
```

---

## CONFIG NAMESPACES

```typescript
// src/config/app.config.ts
export default registerAs('app', () => ({
  nodeEnv:        process.env.NODE_ENV || 'development',
  port:           parseInt(process.env.PORT, 10) || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
}));

// src/config/jwt.config.ts
export default registerAs('jwt', () => ({
  accessSecret:  process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry:  process.env.JWT_ACCESS_EXPIRY  || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));

// src/config/database.config.ts
export default registerAs('database', () => ({
  driver:   process.env.DB_DRIVER || 'prisma',
  url:      process.env.DATABASE_URL,
  mongoUri: process.env.MONGO_URI,
}));

// src/config/redis.config.ts
export default registerAs('redis', () => ({
  host:     process.env.REDIS_HOST || 'localhost',
  port:     parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db:       parseInt(process.env.REDIS_DB, 10) || 0,
}));

// src/config/stripe.config.ts
export default registerAs('stripe', () => ({
  secretKey:     process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
}));
```

---

## .env.example (always keep updated)

```bash
# App
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Database
DB_DRIVER=prisma                # prisma | mongoose
DATABASE_URL=postgresql://user:password@localhost:5432/appdb
MONGO_URI=mongodb://localhost:27017/appdb

# JWT — CHANGE THESE IN PRODUCTION
JWT_ACCESS_SECRET=change-this-to-a-32-char-minimum-secret-here
JWT_REFRESH_SECRET=change-this-to-a-different-32-char-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Encryption
ENCRYPTION_KEY=change-this-to-a-32-char-minimum-key-here-!
```

---

## USAGE IN SERVICES

```typescript
// ✅ Correct — always typed access via namespace
constructor(private config: ConfigService) {}

const port = this.config.get<number>('app.port');
const secret = this.config.get<string>('jwt.accessSecret');
const isProd = this.config.get('app.nodeEnv') === 'production';

// ❌ Never direct process.env access
const secret = process.env.JWT_ACCESS_SECRET; // WRONG
```

---

## KEY DOCS

```
NestJS Config:      https://docs.nestjs.com/techniques/configuration
Joi validation:     https://joi.dev/api/
```