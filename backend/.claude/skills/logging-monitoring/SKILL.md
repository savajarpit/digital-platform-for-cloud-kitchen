---
name: logging-monitoring
description: >
  Read for any logging, monitoring, or error tracking task:
  structured logs, NestJS Logger, Sentry integration,
  request tracing, or log levels per environment.
  Read general-guidelines.md → this file.
  NestJS logging: https://docs.nestjs.com/techniques/logger
  Sentry NestJS:  https://docs.nestjs.com/recipes/sentry
---

# Logging & Monitoring Skill

## PROJECT DECISIONS

```
Logger:     NestJS built-in Logger (no extra library needed)
Log levels: error + warn + log in production | + debug + verbose in dev
Tracing:    X-Request-ID header on every request (set in RequestIdMiddleware)
Errors:     Sentry for production error tracking
Format:     Structured — always include requestId, userId, tenantId when available
Rule:       Never console.log — always NestJS Logger
```

---

## LOGGER USAGE IN SERVICES

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  //                                           ↑ class name as context

  async create(dto: CreateUserDto, tenantId: string) {
    this.logger.log(`Creating user: ${dto.email} [tenant: ${tenantId}]`);

    try {
      const user = await this.repo.create(dto);
      this.logger.log(`User created: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${dto.email}`, error.stack);
      throw error;
    }
  }
}

// Log levels:
this.logger.log('Normal info')           // production
this.logger.warn('Something unusual')    // production
this.logger.error('Something failed', stack) // production
this.logger.debug('Detailed info')       // dev only
this.logger.verbose('Very detailed')     // dev only
```

---

## BOOTSTRAP LOGGER (main.ts)

```typescript
const app = await NestFactory.create(AppModule, {
  logger: isProd
    ? ['error', 'warn', 'log']                          // prod: minimal
    : ['error', 'warn', 'log', 'debug', 'verbose'],     // dev: everything
  bufferLogs: true,
});
```

---

## REQUEST ID MIDDLEWARE

```typescript
// src/common/middleware/request-id.middleware.ts
import { v4 as uuidv4 } from 'uuid';

export function RequestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  (res as any).setHeader('X-Request-ID', requestId);
  next();
}
// Register in main.ts: app.use(RequestIdMiddleware);
```

---

## LOGGING INTERCEPTOR

```typescript
// src/common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const requestId = req.headers['x-request-id'];
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        this.logger.log(`${method} ${url} ${res.statusCode} ${Date.now()-start}ms [${requestId}]`);
      }),
      catchError((err) => {
        this.logger.error(`${method} ${url} ERROR ${Date.now()-start}ms [${requestId}]`, err.stack);
        return throwError(() => err);
      }),
    );
  }
}
```

---

## SENTRY INTEGRATION

```bash
npm install @sentry/nestjs @sentry/profiling-node
```

```typescript
// src/main.ts — init before anything else
import * as Sentry from '@sentry/nestjs';

if (isProd) {
  Sentry.init({
    dsn: config.get('sentry.dsn'),
    environment: config.get('app.nodeEnv'),
    tracesSampleRate: 0.1,    // 10% of transactions
    profilesSampleRate: 0.1,
  });
}

// In AllExceptionsFilter — report unexpected errors
catch(exception: unknown, host: ArgumentsHost) {
  if (isProd && !(exception instanceof HttpException)) {
    Sentry.captureException(exception);
  }
  // ... rest of filter
}
```

---

## WHAT TO LOG

```
✅ Request: method, url, status, duration, requestId
✅ Auth: login attempts (success + failure, with IP), token refresh
✅ Errors: all 500s with stack trace + requestId
✅ Business events: user created, payment processed, subscription changed
✅ Slow queries: > 200ms (in PrismaService)
✅ Queue failures: after all retries exhausted

❌ Never log: passwords, tokens, card numbers, full request bodies
❌ Never log PII (email, phone) in prod without masking
❌ Never log in tight loops — it's an I/O operation
```

---

## LOG LEVELS BY ENVIRONMENT

```
development:   error, warn, log, debug, verbose
staging:       error, warn, log, debug
production:    error, warn, log
test:          error only
```

---

## KEY DOCS

```
NestJS Logger:  https://docs.nestjs.com/techniques/logger
Sentry NestJS:  https://docs.nestjs.com/recipes/sentry
Sentry SDK:     https://docs.sentry.io/platforms/javascript/guides/nestjs/
```
