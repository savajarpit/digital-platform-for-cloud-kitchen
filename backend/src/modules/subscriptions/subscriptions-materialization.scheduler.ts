import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionMaterializationService } from './subscription-materialization.service';

/**
 * Nightly job: for every ACTIVE subscription, materializes "today" into a
 * real Order/OrderItem row from the plan's day/slot template. A single
 * fixed UTC cron computes each subscription's own tenant-local "today"
 * internally, rather than one cron per timezone. The actual per-subscription
 * logic lives in SubscriptionMaterializationService — also reused by
 * SubscriptionsService.verifyPayment() for a same-day (startDateLeadDays=0)
 * signup, which can't wait for tonight's run.
 */
@Injectable()
export class SubscriptionsMaterializationScheduler {
  private readonly logger = new Logger(
    SubscriptionsMaterializationScheduler.name,
  );

  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly materializationService: SubscriptionMaterializationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async materializeToday(): Promise<void> {
    const subscriptions =
      await this.subscriptionsRepo.findActiveSubscriptionsForMaterialization();
    for (const subscription of subscriptions) {
      try {
        await this.materializationService.materializeOne(subscription);
      } catch (error) {
        this.logger.error(
          `Materialization failed for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
