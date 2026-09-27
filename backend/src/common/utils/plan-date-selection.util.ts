import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';
import { PlanScheduleUtil } from './plan-schedule.util';

/** Hard ceiling on how many calendar days the selection window may walk,
 * independent of durationDays + flexibilityDays — a runaway tenant setting
 * (or a very long plan) must never make a customer scroll a year of
 * calendar to pick 7 dates. */
export const MAX_SELECTION_WINDOW_DAYS = 120;

interface SelectionPlan {
  schedulingMode: SubscriptionPlanSchedulingMode;
  weekCount: number | null;
  scheduleAnchorDate: string | null;
  durationDays: number;
}

type ClosureInfo = { name: string | null; note: string | null };

export interface UnavailableSelectionDate {
  date: string;
  kind: 'HOLIDAY' | 'OFF_DAY';
  /** HOLIDAY only — the closure's customer-visible name and note. */
  holiday: ClosureInfo | null;
}

export interface SelectionWindow {
  /** Pickable delivery dates, ascending. */
  candidates: string[];
  /** Every non-pickable date between startDateStr and the last candidate. */
  unavailable: UnavailableSelectionDate[];
}

/** The customer's pre-checkout choice: exactly
 * `durationDaysSnapshot + flexibilityDays` real delivery days walked forward
 * from `startDateStr` — holidays and plan off-days are skipped and do NOT
 * count towards the flexibility, so "7 extra days" always means 7 extra
 * pickable dates. The walk stops early at MAX_SELECTION_WINDOW_DAYS calendar
 * days. Mirrors buildPlanCalendar's own DELIVERY classification so the
 * checkout picker and the browsing preview never disagree on a date.
 *
 * `deliveryDayKeys` is WEEKLY_FIXED-only (null/ignored for RELATIVE_DAY,
 * which has no off-day concept — every non-closed calendar day delivers). */
export function computeSelectionWindow(
  plan: SelectionPlan,
  deliveryDayKeys: ReadonlySet<string> | null,
  startDateStr: string,
  durationDaysSnapshot: number,
  flexibilityDays: number,
  closures: ReadonlyMap<string, ClosureInfo>,
): SelectionWindow {
  const wanted = durationDaysSnapshot + flexibilityDays;
  const candidates: string[] = [];
  const unavailable: UnavailableSelectionDate[] = [];
  let cursor = startDateStr;
  for (
    let i = 0;
    i < MAX_SELECTION_WINDOW_DAYS && candidates.length < wanted;
    i++
  ) {
    const closure = closures.get(cursor);
    if (closure) {
      unavailable.push({
        date: cursor,
        kind: 'HOLIDAY',
        holiday: { name: closure.name, note: closure.note },
      });
    } else if (!isPlanDeliveryDay(plan, deliveryDayKeys, cursor)) {
      unavailable.push({ date: cursor, kind: 'OFF_DAY', holiday: null });
    } else {
      candidates.push(cursor);
    }
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return { candidates, unavailable };
}

/** Just the pickable dates of computeSelectionWindow — what subscribe() and
 * the post-purchase "move" re-derive to validate a customer's choice. */
export function computeCandidateDeliveryDates(
  plan: SelectionPlan,
  deliveryDayKeys: ReadonlySet<string> | null,
  startDateStr: string,
  durationDaysSnapshot: number,
  flexibilityDays: number,
  closedDates: ReadonlySet<string>,
): string[] {
  const closures = new Map<string, ClosureInfo>(
    [...closedDates].map((d) => [d, { name: null, note: null }]),
  );
  return computeSelectionWindow(
    plan,
    deliveryDayKeys,
    startDateStr,
    durationDaysSnapshot,
    flexibilityDays,
    closures,
  ).candidates;
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
