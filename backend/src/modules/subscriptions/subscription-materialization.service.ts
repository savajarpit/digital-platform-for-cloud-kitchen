import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionBankingService } from './subscription-banking.service';
import { DateUtil } from '../../common/utils/date.util';
import { PlanScheduleUtil } from '../../common/utils/plan-schedule.util';
import { closedDatesAffecting } from '../../common/utils/closed-dates.util';
import { SettingsRepository } from '../settings/settings.repository';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';

/**
 * The actual "turn one subscription's today into a real Order" logic —
 * shared by the nightly cron (SubscriptionsMaterializationScheduler, every
 * ACTIVE subscription) and SubscriptionsService.verifyPayment()'s same-day
 * inline call (a single freshly-activated subscription, when the tenant has
 * startDateLeadDays === 0 and can't wait for tonight's run). Extracted here
 * so both call sites run the exact same code, not two copies that could
 * drift.
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
 *
 * WEEKLY_FIXED plans (see PlanScheduleUtil) resolve the day purely from the
 * real calendar instead of nextPlanDayNumber, which is deliberately left
 * frozen for them. One direct consequence: for RELATIVE_DAY, a skip shifts
 * every future template day later (the counter simply doesn't advance);
 * for WEEKLY_FIXED, a skip removes only that day's order — every later day
 * is still whatever real weekday it actually is, nothing shifts. This is
 * inherent to "calendar-driven, not per-subscriber-offset," not a bug.
 *
 * A `usesDateSelection` subscriber (chose individual delivery dates at
 * signup, see SubscriptionScheduledDate) only ever delivers on a date that
 * has a scheduled-date row — every other calendar day between startDate and
 * cycleEnd is silently a no-op, not a skip (nothing was ever promised for
 * it). Its `nextPlanDayNumber` advances only on a delivered scheduled date,
 * so for RELATIVE_DAY a skip shifts later menus just like a contiguous plan.
 *
 * A tenant closed date that applies to subscriptions is handled lazily, on
 * the day itself, as a tenant-side skip (see materializeClosedDate) — so a
 * closure added at the last minute still works and nothing has to be
 * back-filled onto existing subscribers when the date is saved.
 */
@Injectable()
export class SubscriptionMaterializationService {
  private readonly logger = new Logger(SubscriptionMaterializationService.name);

  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly bankingService: SubscriptionBankingService,
  ) {}

  async materializeOne(subscription: {
    id: string;
    tenantId: string;
    userId: string;
    addressId: string;
    deliverySlotId: string | null;
    planId: string;
    planNameSnapshot: string;
    nextPlanDayNumber: number;
    usesDateSelection: boolean;
    startDate: Date | null;
    cycleEnd: Date | null;
    plan: {
      durationDays: number;
      schedulingMode: SubscriptionPlanSchedulingMode;
      weekCount: number | null;
      scheduleAnchorDate: string | null;
      offDayHandling: SubscriptionOffDayHandling;
    };
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

    // A date-selection subscriber only ever delivers on a date they actually
    // chose — every other day in [startDate, cycleEnd] is silently not a
    // delivery day (not a skip: nothing was ever promised for it).
    if (subscription.usesDateSelection) {
      const scheduled = await this.subscriptionsRepo.findScheduledDate(
        subscription.id,
        todayStr,
      );
      if (!scheduled) return;
    }

    // Tenant closure (holiday) that applies to subscriptions — checked after
    // the skip lookup so a customer's own skip or a declared disruption on
    // the same date wins and is never compensated twice.
    const closedDates = await this.settingsRepo.findClosedDates(
      subscription.tenantId,
    );
    const closure = closedDatesAffecting(closedDates, 'SUBSCRIPTIONS').find(
      (c) => c.date === todayStr,
    );
    if (closure) {
      await this.materializeClosedDate(
        { ...subscription, cycleEnd: subscription.cycleEnd },
        todayStr,
        closure.name,
      );
      return;
    }

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

    const key = PlanScheduleUtil.resolveKey(subscription.plan, {
      dateStr: todayStr,
      relativeCounter: subscription.nextPlanDayNumber,
    });
    const planDay =
      'dayNumber' in key
        ? await this.subscriptionsRepo.findPlanDayWithSlots(
            subscription.planId,
            key.dayNumber,
          )
        : await this.subscriptionsRepo.findPlanDayByWeekAndWeekday(
            subscription.planId,
            key.weekNumber,
            key.weekday,
          );
    const templateLabel = PlanScheduleUtil.describeKey(key);
    const notes = override?.note
      ? `Subscription: ${subscription.planNameSnapshot} — ${templateLabel} — Note: ${override.note}`
      : `Subscription: ${subscription.planNameSnapshot} — ${templateLabel}`;

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
        notes,
        deliverySlotId: slot?.id,
        deliverySlotName: slot?.name ?? 'Subscription delivery',
        deliveryWindowStart: slot?.startTime ?? '00:00',
        deliveryWindowEnd: slot?.endTime ?? '23:59',
        items,
      });
    } else {
      this.logger.warn(
        `Subscription ${subscription.id}: plan ${templateLabel} has no decided meals — nothing delivered today.`,
      );
    }

    // RELATIVE_DAY only — WEEKLY_FIXED derives the day purely from the
    // calendar (see PlanScheduleUtil), so nextPlanDayNumber has no meaning
    // for it and is deliberately left frozen at its default. A date-selection
    // subscriber advances it too, only on a delivered scheduled date — so a
    // skipped date shifts later dates' menus exactly like a contiguous plan,
    // instead of losing that day's menu and repeating Day 1 on the banked date.
    if (
      subscription.plan.schedulingMode ===
      SubscriptionPlanSchedulingMode.RELATIVE_DAY
    ) {
      await this.subscriptionsRepo.advanceSubscriptionDay(
        subscription.id,
        subscription.nextPlanDayNumber + 1,
      );
    }
  }

  /** No order is created. A tenant-side SubscriptionSkip is recorded (which
   * also makes a cron re-run a no-op via findSkipForDate) and, when the
   * subscriber is owed the day back, cycleEnd moves out by one real
   * delivery day that is not itself closed (via SubscriptionBankingService,
   * which also appends a new SubscriptionScheduledDate row for a
   * `usesDateSelection` subscriber). RELATIVE_DAY always compensates —
   * durationDays is a count of deliveries and a planned closure must not eat
   * one. WEEKLY_FIXED follows the plan's own offDayHandling, exactly like a
   * weekday with no meals. */
  private async materializeClosedDate(
    subscription: {
      id: string;
      tenantId: string;
      planId: string;
      cycleEnd: Date;
      usesDateSelection: boolean;
      plan: {
        schedulingMode: SubscriptionPlanSchedulingMode;
        offDayHandling: SubscriptionOffDayHandling;
      };
    },
    dateStr: string,
    closureName: string | null,
  ): Promise<void> {
    const compensate =
      subscription.plan.schedulingMode ===
        SubscriptionPlanSchedulingMode.RELATIVE_DAY ||
      subscription.plan.offDayHandling ===
        SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE;

    await this.subscriptionsRepo.createSkip({
      subscriptionId: subscription.id,
      dateFrom: dateStr,
      dateTo: dateStr,
      bankedDays: compensate ? 1 : 0,
      reason: closureName ?? 'Kitchen closed',
    });
    if (!compensate) return;

    const newCycleEnd = await this.bankingService.bankExtraDays(
      subscription.tenantId,
      subscription,
      1,
    );
    await this.subscriptionsRepo.extendCycleEnd(
      subscription.id,
      newCycleEnd,
      1,
    );
  }
}

function generateSubscriptionOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `SUB-${datePart}-${randomPart}`;
}
