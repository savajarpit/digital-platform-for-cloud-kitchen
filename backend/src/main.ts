import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true, // required for Stripe webhooks
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const isProd = config.get<string>('app.nodeEnv') === 'production';

  // ── Security ──────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS ──────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = config.get<string[]>('app.allowedOrigins') ?? [];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Tenant-ID',
    ],
    exposedHeaders: ['X-Request-ID'],
  });

  // ── Compression ───────────────────────────────────────
  app.use(compression());

  // ── Request ID ────────────────────────────────────────
  app.use(RequestIdMiddleware);

  // ── Global Prefix & Versioning ────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Validation Pipe ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Interceptors ───────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30_000),
    new ClassSerializerInterceptor(reflector),
    new ResponseTransformInterceptor(reflector),
  );

  // ── Global Exception Filter ───────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter(config));

  // ── Graceful Shutdown ─────────────────────────────────
  app.enableShutdownHooks();

  // ── Swagger ───────────────────────────────────────────
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS SaaS Starter')
      .setDescription(
        'Base project API — multi-tenant, single-tenant, B2C ready',
      )
      .setVersion('1.0')
      .addServer(`http://localhost:${port}`, 'Local')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'access-token',
      )
      .addTag('auth', 'Authentication & authorization')
      .addTag('users', 'User management')
      .addTag('health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'SaaS Starter API Docs',
    });

    logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`🚀 App running: http://localhost:${port}/api/v1`);
  logger.log(`🌍 Environment: ${config.get('app.nodeEnv')}`);
}

bootstrap();
