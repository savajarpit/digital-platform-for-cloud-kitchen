import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';
import { PlanScheduleUtil } from './plan-schedule.util';
import type { ClosedDateEntry } from './closed-dates.util';
import type { HolidayProjection } from './subscription-holiday-projection.util';

/** Safety cap on the walk — far past any real subscription span. */
const MAX_SUBSCRIPTION_CALENDAR_DAYS = 400;

export type SubscriptionDayKind =
  | 'DELIVERED'
  | 'UPCOMING'
  | 'SKIPPED'
  | 'DISRUPTED'
  | 'HOLIDAY'
  | 'OFF_DAY'
  | 'NOT_SCHEDULED'
  /** Past today's cycleEnd — the day an upcoming holiday will add back. */
  | 'PROJECTED';

export interface SubscriptionCalendarMeal {
  slotType: string;
  mealId: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface SubscriptionCalendarDay {
  /** YYYY-MM-DD, tenant-local. */
  date: string;
  kind: SubscriptionDayKind;
  /** RELATIVE_DAY only: which template day this is ("Day 3"). */
  dayLabel: string | null;
  /** Empty for SKIPPED, DISRUPTED, HOLIDAY, OFF_DAY, NOT_SCHEDULED. */
  meals: SubscriptionCalendarMeal[];
  addressId: string;
  deliverySlotId: string | null;
  isOverridden: boolean;
  note: string | null;
  /** DISRUPTED/HOLIDAY only — the tenant's reason/name for that day. */
  reason: string | null;
  /** Upcoming HOLIDAY only — the day it will add at the end of the plan. */
  replacementDate: string | null;
  /** Too close to delivery to skip/override/move — the notice window has passed. */
  locked: boolean;
}

interface CalendarSubscription {
  addressId: string;
  deliverySlotId: string | null;
  usesDateSelection: boolean;
  skips: {
    dateFrom: string;
    dateTo: string;
    reason: string | null;
    disruptionId: string | null;
  }[];
  dayOverrides: {
    date: string;
    addressId: string | null;
    deliverySlotId: string | null;
    note: string | null;
  }[];
  /** Only meaningful when usesDateSelection — every other date is NOT_SCHEDULED. */
  scheduledDates: { date: string; sequence: number }[];
  plan: {
    schedulingMode: SubscriptionPlanSchedulingMode;
    weekCount: number | null;
    scheduleAnchorDate: string | null;
    durationDays: number;
    days: {
      dayNumber: number | null;
      weekNumber: number | null;
      weekday: number | null;
      slots: {
        slotType: string;
        meal: { id: string; name: string; imageUrl: string | null } | null;
      }[];
    }[];
  };
}

/**
 * The full lifetime of a real subscription — past (delivered/skipped) and
 * future (upcoming/locked) — for the account "My Subscription" calendar.
 * Mirrors SubscriptionMaterializationService's own precedence so this view
 * can never disagree with what actually happened or will happen:
 *
 * NOT_SCHEDULED (usesDateSelection, no row for this date) beats everything
 * else — nothing was ever promised for it. Then DISRUPTED (a tenant-declared
 * disruption skip, `disruptionId` set) > HOLIDAY (a tenant closure skip, or
 * one declared for a future date the cron hasn't reached yet) > OFF_DAY
 * (WEEKLY_FIXED weekday with zero decided slots) > SKIPPED (the customer's
 * own skip/pause) > DELIVERED/UPCOMING.
 *
 * `closedDates` must already be filtered to the ones that apply to
 * subscriptions. A date is DELIVERED once it's in the past — materialization
 * runs nightly, so today itself is never assumed delivered yet.
 *
 * RELATIVE_DAY dayNumber: replayed from Day 1 at the start date, advancing
 * on every delivered day — never on an off, skipped, holiday or (for
 * `usesDateSelection`) unscheduled date — the exact same rule the
 * materializer itself uses, so a past date's label can be reconstructed
 * without having persisted it.
 *
 * `projection` (optional) extends the walk past cycleEnd to the days that
 * upcoming holidays will add back (PROJECTED), and tags each such holiday
 * with its replacementDate — display only, see projectHolidayReplacements.
 */
export function buildSubscriptionCalendarDays(
  subscription: CalendarSubscription,
  startDateStr: string,
  cycleEndStr: string,
  todayStr: string,
  earliestEditableDateStr: string,
  closedDates: ClosedDateEntry[],
  projection?: HolidayProjection,
): SubscriptionCalendarDay[] {
  const projectedDates = new Set(projection?.projectedDates ?? []);
  // Walk on past cycleEnd to the last day an upcoming holiday will add.
  const lastProjected = projection?.projectedDates.at(-1);
  const lastDateStr =
    lastProjected && lastProjected > cycleEndStr ? lastProjected : cycleEndStr;
  const weekly =
    subscription.plan.schedulingMode ===
    SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
  const closedByDate = new Map(closedDates.map((c) => [c.date, c]));
  const scheduledByDate = new Map(
    subscription.scheduledDates.map((s) => [s.date, s]),
  );
  const overridesByDate = new Map(
    subscription.dayOverrides.map((o) => [o.date, o]),
  );
  const byWeekWeekday = new Map(
    subscription.plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
  );
  const byDayNumber = new Map(
    subscription.plan.days.map((d) => [d.dayNumber, d]),
  );
  const deliveryDayKeys = new Set(
    subscription.plan.days
      .filter((d) => weekly && d.slots.length > 0)
      .map((d) => `${d.weekNumber}-${d.weekday}`),
  );
  const findSkip = (date: string) =>
    subscription.skips.find((s) => s.dateFrom <= date && date <= s.dateTo);

  const toMeals = (
    day:
      | { slots: CalendarSubscription['plan']['days'][number]['slots'] }
      | undefined,
  ): SubscriptionCalendarMeal[] =>
    (day?.slots ?? []).map((slot) => ({
      slotType: slot.slotType,
      mealId: slot.meal?.id ?? null,
      name: slot.meal?.name ?? null,
      imageUrl: slot.meal?.imageUrl ?? null,
    }));

  const isPlanOffWeekday = (dateStr: string): boolean => {
    const key = PlanScheduleUtil.resolveKey(subscription.plan, {
      dateStr,
      relativeCounter: 1, // unused for WEEKLY_FIXED
    });
    return (
      !('weekNumber' in key) ||
      !deliveryDayKeys.has(`${key.weekNumber}-${key.weekday}`)
    );
  };

  const days: SubscriptionCalendarDay[] = [];
  // RELATIVE_DAY only — replayed from Day 1, exactly mirroring
  // SubscriptionMaterializationService's own advance rule.
  let relativeCounter = 1;
  let cursor = startDateStr;
  for (
    let i = 0;
    i < MAX_SUBSCRIPTION_CALENDAR_DAYS && cursor <= lastDateStr;
    i++
  ) {
    const override = overridesByDate.get(cursor);
    const addressId = override?.addressId ?? subscription.addressId;
    const deliverySlotId =
      override?.deliverySlotId ?? subscription.deliverySlotId ?? null;
    const locked = cursor < earliestEditableDateStr;
    const skip = findSkip(cursor);
    const closure = closedByDate.get(cursor);

    let kind: SubscriptionDayKind;
    let meals: SubscriptionCalendarMeal[] = [];
    let dayLabel: string | null = null;
    let reason: string | null = null;
    let isOffDay = false;

    const beyondCycle = cursor > cycleEndStr;

    if (
      subscription.usesDateSelection &&
      !scheduledByDate.has(cursor) &&
      !projectedDates.has(cursor)
    ) {
      kind = 'NOT_SCHEDULED';
    } else if (skip?.disruptionId) {
      kind = 'DISRUPTED';
      reason = skip.reason;
    } else if (skip?.reason) {
      kind = 'HOLIDAY';
      reason = skip.reason;
    } else if (
      closure &&
      cursor >= todayStr &&
      !(weekly && isPlanOffWeekday(cursor))
    ) {
      // Declared for a future date the nightly cron hasn't reached yet. A
      // WEEKLY_FIXED plan's own off weekday stays OFF_DAY below — the
      // materializer doesn't treat a closure there as a holiday either.
      kind = 'HOLIDAY';
      reason = closure.name ?? closure.note;
    } else {
      const key = PlanScheduleUtil.resolveKey(subscription.plan, {
        dateStr: cursor,
        relativeCounter,
      });
      const weekKey =
        'weekNumber' in key ? `${key.weekNumber}-${key.weekday}` : '';
      if (weekly && !deliveryDayKeys.has(weekKey)) {
        kind = 'OFF_DAY';
        isOffDay = true;
      } else if (skip) {
        kind = 'SKIPPED';
      } else {
        kind = beyondCycle
          ? 'PROJECTED'
          : cursor < todayStr
            ? 'DELIVERED'
            : 'UPCOMING';
        if ('dayNumber' in key) {
          dayLabel = `Day ${key.dayNumber}`;
          meals = toMeals(byDayNumber.get(key.dayNumber));
        } else {
          meals = toMeals(byWeekWeekday.get(weekKey));
        }
      }
    }

    // Advance the replayed RELATIVE_DAY counter on every real day this
    // subscriber's own template consumed — off days and skips don't count,
    // matching SubscriptionMaterializationService exactly.
    if (
      !weekly &&
      !isOffDay &&
      kind !== 'NOT_SCHEDULED' &&
      kind !== 'SKIPPED' &&
      kind !== 'DISRUPTED' &&
      kind !== 'HOLIDAY'
    ) {
      relativeCounter++;
    }

    days.push({
      date: cursor,
      kind,
      dayLabel,
      meals,
      addressId,
      deliverySlotId,
      isOverridden: Boolean(override),
      note: override?.note ?? null,
      reason,
      replacementDate:
        kind === 'HOLIDAY'
          ? (projection?.replacementByHoliday.get(cursor) ?? null)
          : null,
      // Not part of the subscription yet, so nothing on it can be changed.
      locked: locked || beyondCycle,
    });
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return days;
}
