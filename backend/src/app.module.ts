import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';

// Config
import {
  appConfig,
  jwtConfig,
  databaseConfig,
  redisConfig,
  stripeConfig,
  mailConfig,
} from './config';

// Database
import { DB_DRIVER } from './config/database.config';
import { PrismaModule } from './database/prisma/prisma.module';
import { MongooseConfigModule } from './database/mongoose/mongoose.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { TenantStatusGuard } from './common/guards/tenant-status.guard';

// Middleware
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

// Shared modules
import { QueueModule } from './shared-modules/queue/queue.module';
import { RedisModule } from './shared-modules/cache/redis.module';
import { TenantResolverModule } from './common/tenant-resolver.module';

// Modules
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MenuModule } from './modules/menu/menu.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      load: [
        appConfig,
        jwtConfig,
        databaseConfig,
        redisConfig,
        stripeConfig,
        mailConfig,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DB_DRIVER: Joi.string().valid('prisma', 'mongoose').default('prisma'),
        PROJECT_TYPE: Joi.string()
          .valid('multi_tenant', 'single_tenant', 'b2c')
          .default('multi_tenant'),
        DATABASE_URL: Joi.string().when('DB_DRIVER', {
          is: 'prisma',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        MONGO_URI: Joi.string().when('DB_DRIVER', {
          is: 'mongoose',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
        ENCRYPTION_KEY: Joi.string().min(32).optional(),
      }),
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),

    // ── Rate Limiting ────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 100 },
      { name: 'long', ttl: 3_600_000, limit: 1000 },
    ]),

    // ── Database ─────────────────────────────────────────
    // Switch between Prisma and Mongoose via DB_DRIVER env var
    DB_DRIVER === 'prisma' ? PrismaModule : MongooseConfigModule,

    // ── Shared Modules ───────────────────────────────────
    TenantResolverModule,
    RedisModule,
    QueueModule,

    // ── Feature Modules ──────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    MenuModule,
    AddressesModule,
    OrdersModule,
    PaymentsModule,
  ],

  providers: [
    TenantContextMiddleware,
    // Global guards — order matters
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // 1st — JWT auth
    { provide: APP_GUARD, useClass: RolesGuard }, // 2nd — role check
    { provide: APP_GUARD, useClass: TenantGuard }, // 3rd — tenant isolation
    { provide: APP_GUARD, useClass: TenantStatusGuard }, // 4th — tenant must be ACTIVE
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // 5th — rate limiting
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Resolves the tenant from the Host header before any guard runs.
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
