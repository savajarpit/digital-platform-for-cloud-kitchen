---
name: queue
description: >
  Read for any background job task: Bull queues, job processors,
  retry logic, scheduled jobs, or heavy async operations.
  Read general-guidelines.md → nestjs.md → this file.
  NestJS queues: https://docs.nestjs.com/techniques/queues
---

# Queue Skill

## PROJECT DECISIONS

```
Library:    @nestjs/bull + Bull + Redis backend
Location:   src/shared-modules/queue/
Pattern:    Named queues per domain (mail, export, notification)
Rule:       Any operation > 200ms or involving external API → use a queue
```

---

## INSTALL

```bash
npm install @nestjs/bull bull ioredis
npm install @types/bull --save-dev
```

---

## QUEUE MODULE SETUP

```typescript
// app.module.ts
import { BullModule } from '@nestjs/bull';

BullModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    redis: {
      host:     config.get('redis.host'),
      port:     config.get('redis.port'),
      password: config.get('redis.password'),
    },
  }),
  inject: [ConfigService],
}),

// Register named queues (add as needed)
BullModule.registerQueue({ name: 'mail' }),
BullModule.registerQueue({ name: 'export' }),
BullModule.registerQueue({ name: 'notification' }),
```

---

## PROCESSOR (worker)

```typescript
// src/shared-modules/queue/processors/mail.processor.ts
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

export interface WelcomeEmailJob {
  email: string;
  firstName: string;
  tenantId: string;
}

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  @Process('send-welcome')
  async sendWelcome(job: Job<WelcomeEmailJob>) {
    this.logger.log(`Sending welcome email to ${job.data.email}`);
    // await this.mailService.sendWelcome(job.data);
    // If this throws, Bull will retry according to job options
  }

  @Process('send-reset-password')
  async sendResetPassword(job: Job<{ email: string; token: string }>) {
    // await this.mailService.sendResetPassword(job.data);
  }

  // Called when a job fails after all retries
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.name} failed after ${job.attemptsMade} attempts`, error.stack);
    // Notify Sentry or alert team for critical failures
  }
}
```

---

## ADDING JOBS (from a service)

```typescript
// In any service that needs background processing
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AuthService {
  constructor(@InjectQueue('mail') private mailQueue: Queue) {}

  async register(dto: RegisterDto) {
    const user = await this.usersRepo.create(dto);

    // Fire and forget — doesn't block the HTTP response
    await this.mailQueue.add('send-welcome',
      { email: user.email, firstName: user.firstName, tenantId: user.tenantId },
      {
        attempts:        3,           // retry 3 times on failure
        backoff:         { type: 'exponential', delay: 5000 },  // 5s, 10s, 20s
        removeOnComplete: true,       // clean up completed jobs
        removeOnFail:    false,       // keep failed jobs for debugging
        delay:           0,           // start immediately
      },
    );

    return user;
  }
}
```

---

## JOB OPTIONS REFERENCE

```typescript
{
  attempts:         3,             // retry up to 3 times
  backoff: {
    type: 'exponential',           // or 'fixed'
    delay: 5000,                   // base delay in ms
  },
  removeOnComplete: true,          // remove successful jobs
  removeOnFail:     false,         // keep failed jobs for inspection
  priority:         1,             // lower number = higher priority
  delay:            5000,          // delay job by 5 seconds
  timeout:          30000,         // fail if not done in 30s
  jobId:            'unique-id',   // idempotency key — prevent duplicate jobs
}
```

---

## NAMED QUEUES (what to put where)

```
mail         send-welcome, send-reset-password, send-invoice, send-notification
export       export-csv, export-pdf, export-report
notification push-notification, send-sms, send-slack
sync         sync-external-api, sync-crm, import-data
cleanup      delete-expired-tokens, purge-soft-deleted, archive-old-records
```

---

## RULES

```
✅ Any external API call → queue (email, SMS, Stripe webhook side effects)
✅ Any operation > 200ms → queue
✅ Always set attempts + backoff for retries
✅ removeOnComplete: true — don't fill Redis with old jobs
✅ removeOnFail: false — keep for debugging
✅ Use jobId for idempotency when same job shouldn't run twice
✅ Log @OnQueueFailed and alert for critical queues

❌ Never put DB-only operations in queues — they're fast enough
❌ Never process synchronously what can be deferred
❌ Never ignore failed jobs silently
```

---

## KEY DOCS

```
NestJS queues:  https://docs.nestjs.com/techniques/queues
Bull docs:      https://docs.bullmq.io/ (newer BullMQ) or https://github.com/OptimalBits/bull
```