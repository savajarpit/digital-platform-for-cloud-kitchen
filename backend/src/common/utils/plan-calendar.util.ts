import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import { DateUtil } from './date.util';
import { PlanScheduleUtil } from './plan-schedule.util';
import type { ClosedDateEntry } from './closed-dates.util';

/** Safety cap on the forward walk — far past any real plan span. */
const MAX_CALENDAR_DAYS = 400;

export type PlanCalendarDayKind = 'DELIVERY' | 'OFF_DAY' | 'HOLIDAY';

export interface PlanCalendarMeal {
  slotType: string;
  mealId: string | null;
  /** null = the kitchen has not decided this slot's meal yet. */
  name: string | null;
  imageUrl: string | null;
}

export interface PlanCalendarDay {
  /** YYYY-MM-DD, tenant-local. */
  date: string;
  kind: PlanCalendarDayKind;
  /** Set only for HOLIDAY — the customer-visible closure label/note. */
  holiday: { name: string | null; note: string | null } | null;
  /** RELATIVE_DAY only: which template day this delivery is ("Day 3"). */
  dayLabel: string | null;
  /** Empty for OFF_DAY and HOLIDAY. */
  meals: PlanCalendarMeal[];
}

export interface PlanCalendar {
  startDate: string;
  /** Last date of the span a new subscriber would actually receive. */
  endDate: string;
  days: PlanCalendarDay[];
}

interface CalendarPlan {
  schedulingMode: SubscriptionPlanSchedulingMode;
  durationDays: number;
  weekCount: number | null;
  scheduleAnchorDate: string | null;
  offDayHandling: SubscriptionOffDayHandling;
  days: {
    dayNumber: number | null;
    weekNumber: number | null;
    weekday: number | null;
    slots: {
      slotType: string;
      meal: { id: string; name: string; imageUrl: string | null } | null;
    }[];
  }[];
}

/** The storefront's pre-purchase month calendar: every date a brand-new
 * subscriber starting on `startDateStr` would span, each classified as a
 * delivery, a plan off-day, or a tenant holiday.
 *
 * It mirrors how a real subscription actually plays out. A closure that
 * applies to subscriptions is never a delivery day; the materializer credits
 * it back (see SubscriptionMaterializationService.materializeClosedDate), so
 * for RELATIVE_DAY and WEEKLY_FIXED + EXTEND_TO_COMPENSATE the span runs
 * until `durationDays` real deliveries have appeared. WEEKLY_FIXED +
 * LOSS_DELIVERY keeps its flat `durationDays` calendar days, off-days and
 * closures included — they eat into the paid duration there by design.
 *
 * `closedDates` must already be filtered to the ones that apply to
 * subscriptions. */
export function buildPlanCalendar(
  plan: CalendarPlan,
  startDateStr: string,
  closedDates: ClosedDateEntry[],
): PlanCalendar {
  const weekly =
    plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
  const closedByDate = new Map(closedDates.map((c) => [c.date, c]));
  const byWeekWeekday = new Map(
    plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
  );
  const byDayNumber = new Map(plan.days.map((d) => [d.dayNumber, d]));
  // A checked-but-TBD slot still makes a real day; only a weekday with zero
  // slots is genuinely off (same rule as findPlanDeliveryDayKeys).
  const deliveryDayKeys = new Set(
    plan.days
      .filter((d) => weekly && d.slots.length > 0)
      .map((d) => `${d.weekNumber}-${d.weekday}`),
  );
  if (weekly && deliveryDayKeys.size === 0) {
    return { startDate: startDateStr, endDate: startDateStr, days: [] };
  }

  const toMeals = (
    day: CalendarPlan['days'][number] | undefined,
  ): PlanCalendarMeal[] =>
    (day?.slots ?? []).map((slot) => ({
      slotType: slot.slotType,
      mealId: slot.meal?.id ?? null,
      name: slot.meal?.name ?? null,
      imageUrl: slot.meal?.imageUrl ?? null,
    }));

  const countRealDeliveries =
    !weekly ||
    plan.offDayHandling === SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE;

  const days: PlanCalendarDay[] = [];
  let deliveries = 0;
  let cursor = startDateStr;
  for (let i = 0; i < MAX_CALENDAR_DAYS; i++) {
    const closure = closedByDate.get(cursor);
    let kind: PlanCalendarDayKind;
    let meals: PlanCalendarMeal[] = [];
    let dayLabel: string | null = null;

    if (closure) {
      kind = 'HOLIDAY';
    } else if (weekly) {
      const key = PlanScheduleUtil.resolveKey(plan, {
        dateStr: cursor,
        relativeCounter: 1, // unused for WEEKLY_FIXED
      });
      const weekKey =
        'weekNumber' in key ? `${key.weekNumber}-${key.weekday}` : '';
      kind = deliveryDayKeys.has(weekKey) ? 'DELIVERY' : 'OFF_DAY';
      if (kind === 'DELIVERY') meals = toMeals(byWeekWeekday.get(weekKey));
    } else {
      kind = 'DELIVERY';
      const key = PlanScheduleUtil.resolveKey(plan, {
        dateStr: cursor,
        relativeCounter: deliveries + 1,
      });
      if ('dayNumber' in key) {
        dayLabel = `Day ${key.dayNumber}`;
        meals = toMeals(byDayNumber.get(key.dayNumber));
      }
    }

    days.push({
      date: cursor,
      kind,
      holiday: closure ? { name: closure.name, note: closure.note } : null,
      dayLabel,
      meals,
    });
    if (kind === 'DELIVERY') deliveries++;

    const done = countRealDeliveries
      ? deliveries >= plan.durationDays
      : days.length >= plan.durationDays;
    if (done) break;
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }

  return { startDate: startDateStr, endDate: days[days.length - 1].date, days };
}

/** WEEKLY_FIXED only: each given date's menu, resolved from the calendar
 * date itself (so it's fixed no matter which other dates the customer
 * picks). RELATIVE_DAY menus depend on a date's position in the final
 * selection, so the client derives those from the plan's own days. */
export function buildWeeklyMealsByDate(
  plan: CalendarPlan,
  dates: readonly string[],
): Record<string, PlanCalendarMeal[]> {
  const byWeekWeekday = new Map(
    plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
  );
  const result: Record<string, PlanCalendarMeal[]> = {};
  for (const date of dates) {
    const key = PlanScheduleUtil.resolveKey(plan, {
      dateStr: date,
      relativeCounter: 1, // unused for WEEKLY_FIXED
    });
    const day =
      'weekNumber' in key
        ? byWeekWeekday.get(`${key.weekNumber}-${key.weekday}`)
        : undefined;
    result[date] = (day?.slots ?? []).map((slot) => ({
      slotType: slot.slotType,
      mealId: slot.meal?.id ?? null,
      name: slot.meal?.name ?? null,
      imageUrl: slot.meal?.imageUrl ?? null,
    }));
  }
  return result;
}
