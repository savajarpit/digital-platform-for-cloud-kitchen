import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { SubscriptionsRepository } from './subscriptions.repository';
import { DateUtil } from '../../common/utils/date.util';

/**
 * Nightly job: for every ACTIVE subscription, materializes "today" into a
 * real Order/OrderItem row from the plan's day/slot template. A single
 * fixed UTC cron computes each subscription's own tenant-local "today"
 * internally, rather than one cron per timezone.
 *
 * Three deliberate simplifications, all documented in the plan doc (§11):
 * - The template loops via modulo once its own day count is exhausted, so
 *   bonus/banked days beyond the plan's own length still deliver something
 *   real instead of going blank.
 * - A day with every slot still TBD (owner never finished planning it) is
 *   skipped (no order) but still consumes a day count, exactly like a
 *   customer's own unfilled custom-plan selection — logged, not silently
 *   dropped, so it's discoverable without needing a customer complaint.
 * - A subscription whose startDate hasn't arrived yet (tenant-local date
 *   compare, not an instant race against this cron's own fixed run time)
 *   is skipped entirely — Day 1 never fires early.
 */
@Injectable()
export class SubscriptionsMaterializationScheduler {
  private readonly logger = new Logger(
    SubscriptionsMaterializationScheduler.name,
  );

  constructor(private readonly subscriptionsRepo: SubscriptionsRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async materializeToday(): Promise<void> {
    const subscriptions =
      await this.subscriptionsRepo.findActiveSubscriptionsForMaterialization();
    for (const subscription of subscriptions) {
      try {
        await this.materializeOne(subscription);
      } catch (error) {
        this.logger.error(
          `Materialization failed for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async materializeOne(subscription: {
    id: string;
    tenantId: string;
    userId: string;
    addressId: string;
    deliverySlotId: string | null;
    planId: string;
    planNameSnapshot: string;
    nextPlanDayNumber: number;
    startDate: Date | null;
    cycleEnd: Date | null;
    plan: { durationDays: number };
    tenant: { businessProfile: { timezone: string } | null };
  }): Promise<void> {
    if (!subscription.cycleEnd || !subscription.startDate) return;
    const timezone =
      subscription.tenant.businessProfile?.timezone ?? 'Asia/Kolkata';
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    const startDateStr = DateUtil.toTenantDateStr(
      subscription.startDate,
      timezone,
    );
    const cycleEndStr = DateUtil.toTenantDateStr(
      subscription.cycleEnd,
      timezone,
    );

    if (todayStr < startDateStr) return; // Day 1 hasn't arrived yet
    if (todayStr > cycleEndStr) {
      await this.subscriptionsRepo.expireSubscription(subscription.id);
      return;
    }

    const skip = await this.subscriptionsRepo.findSkipForDate(
      subscription.id,
      todayStr,
    );
    if (skip) return; // banked — nextPlanDayNumber does not advance

    // Resolve today's address/slot: a SubscriptionDayOverride wins if one
    // exists for this exact date, otherwise fall back to the subscription's
    // own defaults chosen at signup.
    const override = await this.subscriptionsRepo.findDayOverride(
      subscription.id,
      todayStr,
    );
    const addressId = override?.addressId ?? subscription.addressId;
    const resolvedSlotId =
      override?.deliverySlotId ?? subscription.deliverySlotId ?? undefined;
    const slot = resolvedSlotId
      ? await this.subscriptionsRepo.findDeliverySlotById(
          subscription.tenantId,
          resolvedSlotId,
        )
      : null;

    const templateDayNumber =
      ((subscription.nextPlanDayNumber - 1) % subscription.plan.durationDays) +
      1;
    const planDay = await this.subscriptionsRepo.findPlanDayWithSlots(
      subscription.planId,
      templateDayNumber,
    );

    const items = (planDay?.slots ?? [])
      .filter((slot) => slot.mealId && slot.meal)
      .map((slot) => ({
        mealId: slot.meal!.id,
        nameSnapshot: slot.meal!.name,
        priceInPaiseSnapshot: slot.meal!.priceInPaise,
        quantity: 1,
      }));

    if (items.length > 0) {
      await this.subscriptionsRepo.createMaterializedOrder({
        tenantId: subscription.tenantId,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        addressId,
        orderNumber: generateSubscriptionOrderNumber(),
        notes: `Subscription: ${subscription.planNameSnapshot} — Day ${templateDayNumber}`,
        deliverySlotId: slot?.id,
        deliverySlotName: slot?.name ?? 'Subscription delivery',
        deliveryWindowStart: slot?.startTime ?? '00:00',
        deliveryWindowEnd: slot?.endTime ?? '23:59',
        items,
      });
    } else {
      this.logger.warn(
        `Subscription ${subscription.id}: plan day ${templateDayNumber} has no decided meals — nothing delivered today.`,
      );
    }

    await this.subscriptionsRepo.advanceSubscriptionDay(
      subscription.id,
      subscription.nextPlanDayNumber + 1,
    );
  }
}

function generateSubscriptionOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `SUB-${datePart}-${randomPart}`;
}
