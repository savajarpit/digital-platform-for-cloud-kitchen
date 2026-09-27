import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';
import { PlanScheduleUtil } from './plan-schedule.util';

/** Hard ceiling on the selection window, independent of durationDays +
 * flexibilityDays — a runaway tenant setting (or a very long plan) must
 * never make a customer scroll a year of calendar to pick 7 dates. */
export const MAX_SELECTION_WINDOW_DAYS = 120;

interface SelectionPlan {
  schedulingMode: SubscriptionPlanSchedulingMode;
  weekCount: number | null;
  scheduleAnchorDate: string | null;
  durationDays: number;
}

/** Every date the customer may pick from before checkout: real delivery
 * days only (never a plan off-day or a tenant holiday), spanning
 * `durationDaysSnapshot + flexibilityDays` calendar days from `startDateStr`
 * (capped at MAX_SELECTION_WINDOW_DAYS). Mirrors buildPlanCalendar's own
 * DELIVERY classification so the checkout picker and the browsing preview
 * can never disagree on which dates are pickable.
 *
 * `deliveryDayKeys` is WEEKLY_FIXED-only (null/ignored for RELATIVE_DAY,
 * which has no off-day concept — every non-closed calendar day delivers). */
export function computeCandidateDeliveryDates(
  plan: SelectionPlan,
  deliveryDayKeys: ReadonlySet<string> | null,
  startDateStr: string,
  durationDaysSnapshot: number,
  flexibilityDays: number,
  closedDates: ReadonlySet<string>,
): string[] {
  return windowDates(
    startDateStr,
    durationDaysSnapshot,
    flexibilityDays,
  ).filter(
    (date) =>
      !closedDates.has(date) && isPlanDeliveryDay(plan, deliveryDayKeys, date),
  );
}

export interface UnavailableSelectionDate {
  date: string;
  kind: 'HOLIDAY' | 'OFF_DAY';
  /** HOLIDAY only — the closure's customer-visible name and note. */
  holiday: { name: string | null; note: string | null } | null;
}

/** The dates inside the same selection window that are NOT pickable, and
 * why — so the picker can show a holiday or a plan off-day the same way the
 * browsing calendar does instead of a blank box. Exactly the complement of
 * computeCandidateDeliveryDates over the window. */
export function computeUnavailableDates(
  plan: SelectionPlan,
  deliveryDayKeys: ReadonlySet<string> | null,
  startDateStr: string,
  durationDaysSnapshot: number,
  flexibilityDays: number,
  closedDates: ReadonlyMap<
    string,
    { name: string | null; note: string | null }
  >,
): UnavailableSelectionDate[] {
  const result: UnavailableSelectionDate[] = [];
  for (const date of windowDates(
    startDateStr,
    durationDaysSnapshot,
    flexibilityDays,
  )) {
    const closure = closedDates.get(date);
    if (closure) {
      result.push({
        date,
        kind: 'HOLIDAY',
        holiday: { name: closure.name, note: closure.note },
      });
    } else if (!isPlanDeliveryDay(plan, deliveryDayKeys, date)) {
      result.push({ date, kind: 'OFF_DAY', holiday: null });
    }
  }
  return result;
}

function windowDates(
  startDateStr: string,
  durationDaysSnapshot: number,
  flexibilityDays: number,
): string[] {
  const windowDays = Math.min(
    durationDaysSnapshot + flexibilityDays,
    MAX_SELECTION_WINDOW_DAYS,
  );
  const dates: string[] = [];
  let cursor = startDateStr;
  for (let i = 0; i < windowDays; i++) {
    dates.push(cursor);
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return dates;
}

function isPlanDeliveryDay(
  plan: SelectionPlan,
  deliveryDayKeys: ReadonlySet<string> | null,
  date: string,
): boolean {
  if (plan.schedulingMode !== SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
    return true;
  }
  const key = PlanScheduleUtil.resolveKey(plan, {
    dateStr: date,
    relativeCounter: 1, // unused for WEEKLY_FIXED
  });
  return (
    'weekNumber' in key &&
    (deliveryDayKeys?.has(`${key.weekNumber}-${key.weekday}`) ?? false)
  );
}

/** True when this tenant/plan setup should ask the customer to actively pick
 * every date (a short plan) rather than pre-select everything and only let
 * them adjust exceptions (see the "exceptions mode" storefront UX for long
 * plans — same distinction, kept here so the backend's response can tell
 * the frontend which UX to render without it re-deriving the rule). */
export function isManualSelectionPlan(durationDaysSnapshot: number): boolean {
  return durationDaysSnapshot <= 7;
}

/** Validates a customer's chosen dates against the candidate window: right
 * count, no duplicates, every date actually pickable. Returns the dates
 * sorted ascending (chronological order becomes sequence 1..N regardless of
 * the order the customer tapped them in) or throws a message describing the
 * first problem found. */
export function validateSelectedDates(
  selected: string[],
  candidates: readonly string[],
  requiredCount: number,
): { ok: true; dates: string[] } | { ok: false; message: string } {
  const unique = new Set(selected);
  if (unique.size !== selected.length) {
    return { ok: false, message: 'Delivery dates must not repeat.' };
  }
  if (selected.length !== requiredCount) {
    return {
      ok: false,
      message: `Choose exactly ${requiredCount} delivery date${requiredCount === 1 ? '' : 's'} (got ${selected.length}).`,
    };
  }
  const candidateSet = new Set(candidates);
  const invalid = selected.find((d) => !candidateSet.has(d));
  if (invalid) {
    return {
      ok: false,
      message: `${invalid} is not an available delivery date for this plan.`,
    };
  }
  return { ok: true, dates: [...selected].sort() };
}
