import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsRepository } from './subscriptions.repository';
import {
  type MaterializeOutcome,
  SubscriptionMaterializationService,
} from './subscription-materialization.service';
import {
  JobRunnerService,
  type JobSummary,
} from '../../shared-modules/jobs/job-runner.service';

/** Generous upper bound for one run; the lock expires on its own if a
 * server dies mid-run. */
const LOCK_TTL_SECONDS = 50 * 60;

/**
 * Materializes "today" for every ACTIVE subscription into a real
 * Order/OrderItem row from the plan's day/slot template. Runs every hour,
 * not once a night: each subscription claims its own tenant-local "today"
 * (see SubscriptionMaterializationService.materializeOne), so a run only
 * does the subscriptions not yet done today. That gives:
 * - catch-up — a run missed because the server was down or deploying is
 *   covered by the next hourly tick, instead of losing that day;
 * - each tenant's day processed shortly after its own midnight, rather than
 *   at a fixed server hour (1 AM UTC is 6:30 AM in India);
 * - no double orders — the per-subscription claim plus the job lock hold
 *   even with several backend servers.
 */
@Injectable()
export class SubscriptionsMaterializationScheduler {
  private readonly logger = new Logger(
    SubscriptionsMaterializationScheduler.name,
  );

  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly materializationService: SubscriptionMaterializationService,
    private readonly jobRunner: JobRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async materializeToday(): Promise<void> {
    await this.jobRunner.run(
      'subscription-materialization',
      LOCK_TTL_SECONDS,
      () => this.materializeAll(),
    );
  }

  /** One pass over every ACTIVE subscription; a failing subscription is
   * logged and counted, never stops the rest. */
  async materializeAll(): Promise<JobSummary> {
    const subscriptions =
      await this.subscriptionsRepo.findActiveSubscriptionsForMaterialization();
    const counts: Record<MaterializeOutcome | 'failed', number> = {
      processed: 0,
      'already-done': 0,
      'not-due': 0,
      expired: 0,
      failed: 0,
    };
    for (const subscription of subscriptions) {
      try {
        const outcome =
          await this.materializationService.materializeOne(subscription);
        counts[outcome] += 1;
      } catch (error) {
        counts.failed += 1;
        this.logger.error(
          `Materialization failed for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return counts;
  }
}
