import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import { PlanScheduleUtil } from './plan-schedule.util';
import type { ClosedDateEntry } from './closed-dates.util';

export interface HolidayProjection {
  /** Pending holiday date → the replacement day it will add at the end. */
  replacementByHoliday: Map<string, string>;
  /** The replacement days, in order (all after the current cycleEnd). */
  projectedDates: string[];
}

interface ProjectionSubscription {
  usesDateSelection: boolean;
  skips: { dateFrom: string; dateTo: string }[];
  scheduledDates: { date: string }[];
  plan: {
    schedulingMode: SubscriptionPlanSchedulingMode;
    offDayHandling: SubscriptionOffDayHandling;
    durationDays: number;
    weekCount: number | null;
    scheduleAnchorDate: string | null;
    days: {
      weekNumber: number | null;
      weekday: number | null;
      slots: unknown[];
    }[];
  };
}

const EMPTY: HolidayProjection = {
  replacementByHoliday: new Map(),
  projectedDates: [],
};

/**
 * Display-only preview of what the nightly materializer will do when it
 * reaches each upcoming holiday: record a tenant skip and bank one real
 * delivery day at the end (see materializeClosedDate). Nothing is persisted
 * here, so a holiday deleted before its date simply stops being projected.
 *
 * A holiday is "pending" when it is today or later, inside the subscription,
 * would have been a delivery for this subscriber (a scheduled date for date
 * selection, a delivery weekday for WEEKLY_FIXED) and has no skip yet — a
 * customer skip or an already-materialized holiday has banked its own day.
 * Replacements are walked from cycleEnd with the same closed-date and
 * off-day rules SubscriptionBankingService uses.
 *
 * `closures` must already be filtered to the ones affecting subscriptions.
 */
export function projectHolidayReplacements(
  subscription: ProjectionSubscription,
  todayStr: string,
  startDateStr: string,
  cycleEndStr: string,
  closures: ClosedDateEntry[],
): HolidayProjection {
  const { plan } = subscription;
  const weekly =
    plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
  const compensates =
    !weekly ||
    plan.offDayHandling === SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE;
  if (!compensates || closures.length === 0) return EMPTY;

  const deliveryDayKeys = new Set(
    plan.days
      .filter((d) => d.slots.length > 0)
      .map((d) => `${d.weekNumber}-${d.weekday}`),
  );
  if (weekly && deliveryDayKeys.size === 0) return EMPTY;
  const scheduled = new Set(subscription.scheduledDates.map((s) => s.date));

  const isDeliveryDay = (dateStr: string): boolean => {
    if (subscription.usesDateSelection) return scheduled.has(dateStr);
    if (!weekly) return true;
    const key = PlanScheduleUtil.resolveKey(plan, {
      dateStr,
      relativeCounter: 1,
    });
    return (
      'weekNumber' in key &&
      deliveryDayKeys.has(`${key.weekNumber}-${key.weekday}`)
    );
  };
  const hasSkip = (dateStr: string) =>
    subscription.skips.some(
      (s) => s.dateFrom <= dateStr && dateStr <= s.dateTo,
    );

  const pending = [...new Set(closures.map((c) => c.date))]
    .filter(
      (d) =>
        d >= todayStr &&
        d >= startDateStr &&
        d <= cycleEndStr &&
        !hasSkip(d) &&
        isDeliveryDay(d),
    )
    .sort();
  if (pending.length === 0) return EMPTY;

  const closedSet = new Set(closures.map((c) => c.date));
  const replacementByHoliday = new Map<string, string>();
  const projectedDates: string[] = [];
  let cursor = cycleEndStr;
  for (const holiday of pending) {
    cursor = PlanScheduleUtil.advanceRealDeliveryDays(
      plan,
      weekly ? deliveryDayKeys : null,
      cursor,
      1,
      false,
      closedSet,
    );
    replacementByHoliday.set(holiday, cursor);
    projectedDates.push(cursor);
  }
  return { replacementByHoliday, projectedDates };
}
