import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { DateUtil } from '../../common/utils/date.util';
import { PlanScheduleUtil } from '../../common/utils/plan-schedule.util';
import { subscriptionClosedDateSet } from '../../common/utils/closed-dates.util';
import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';

/**
 * The single place that advances a subscription's cycleEnd by N banked
 * (credited) real delivery days — skip/pause, a tenant disruption, and a
 * tenant closure lazily discovered at materialization all funnel through
 * here, so the off-day-aware and closed-date-aware walk (see
 * PlanScheduleUtil.advanceRealDeliveryDays) can never drift between call
 * sites, and so a `usesDateSelection` subscriber's compensation is never
 * forgotten in one of the three places that used to duplicate this math.
 *
 * For a plain (non-date-selection) subscriber this is exactly the old
 * per-service bankExtraDays: walk forward from the current cycleEnd,
 * skipping any WEEKLY_FIXED off-weekday and any tenant closure, landing on
 * the Nth real day. For a `usesDateSelection` subscriber the SAME walk is
 * done one day at a time so each landed date can be persisted as a new
 * SubscriptionScheduledDate row (sequence = current max + 1, +2, ...) — the
 * stored dates always account for exactly what was banked, the same way
 * cycleEnd itself is never shortened, only extended.
 */
@Injectable()
export class SubscriptionBankingService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async bankExtraDays(
    tenantId: string,
    subscription: {
      id: string;
      planId: string;
      cycleEnd: Date;
      usesDateSelection: boolean;
    },
    bankedDaysDelta: number,
  ): Promise<Date> {
    const plan = await this.subscriptionsRepo.findPlanScheduleConfig(
      subscription.planId,
    );
    if (!plan) {
      // Same fallback the old duplicated methods used — a plan somehow
      // missing its schedule config shouldn't block banking outright.
      return DateUtil.addDays(subscription.cycleEnd, bankedDaysDelta);
    }
    const weekly =
      plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
    const closedDateSet = subscriptionClosedDateSet(
      await this.settingsRepo.findClosedDates(tenantId),
    );

    if (
      !weekly &&
      closedDateSet.size === 0 &&
      !subscription.usesDateSelection
    ) {
      return DateUtil.addDays(subscription.cycleEnd, bankedDaysDelta);
    }

    const timezone = await this.getTenantTimezone(tenantId);
    const currentCycleEndStr = DateUtil.toTenantDateStr(
      subscription.cycleEnd,
      timezone,
    );
    const deliveryDayKeys = weekly
      ? await this.subscriptionsRepo.findPlanDeliveryDayKeys(
          subscription.planId,
        )
      : null;

    if (!subscription.usesDateSelection) {
      const newCycleEndStr = PlanScheduleUtil.advanceRealDeliveryDays(
        plan,
        deliveryDayKeys,
        currentCycleEndStr,
        bankedDaysDelta,
        false,
        closedDateSet,
      );
      return new Date(`${newCycleEndStr}T00:00:00.000Z`);
    }

    const existing = await this.subscriptionsRepo.findScheduledDates(
      subscription.id,
    );
    let nextSequence = (existing.at(-1)?.sequence ?? 0) + 1;
    let cursor = currentCycleEndStr;
    const appended: { date: string; sequence: number }[] = [];
    for (let i = 0; i < bankedDaysDelta; i++) {
      cursor = PlanScheduleUtil.advanceRealDeliveryDays(
        plan,
        deliveryDayKeys,
        cursor,
        1,
        false,
        closedDateSet,
      );
      appended.push({ date: cursor, sequence: nextSequence++ });
    }
    if (appended.length > 0) {
      await this.subscriptionsRepo.createScheduledDates(
        subscription.id,
        appended,
      );
    }
    return new Date(`${cursor}T00:00:00.000Z`);
  }

  private async getTenantTimezone(tenantId: string): Promise<string> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return profile?.timezone ?? 'Asia/Kolkata';
  }
}
