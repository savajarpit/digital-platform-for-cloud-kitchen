import { DateUtil } from './date.util';
import {
  closedDatesAffecting,
  normalizeClosedDates,
} from './closed-dates.util';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_NAMES = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
];

export interface OrderDaySettings {
  isTemporarilyClosed: boolean;
  closureReason: string | null;
  operatingHours: unknown;
  dailyCutoffTime: string | null;
  closedDates: unknown;
}

export type OrderDayAvailability =
  | { open: true }
  | {
      open: false;
      /** Short, customer-facing: "Diwali", "Weekly off", "Cutoff passed"… */
      reason: string;
      /** The whole store is off — nothing can be ordered for any day. */
      storeClosed?: boolean;
    };

/** Whether a scheduled (non-instant) order can be placed for `dateStr`,
 * Zomato "schedule order" style: the kitchen being closed right now doesn't
 * stop a customer booking a later day. A day is closed when:
 * - the store is temporarily closed (every day — current and future);
 * - it's an ORDERS/BOTH holiday;
 * - its weekday has no operating hours (weekly off);
 * - it's today and the daily cutoff (or closing time) has already passed.
 * Before opening time today is fine — the slot is later in the day. */
export function orderDayAvailability(
  settings: OrderDaySettings | null,
  dateStr: string,
  now: { dateStr: string; minutesSinceMidnight: number },
): OrderDayAvailability {
  if (!settings) return { open: true };
  if (settings.isTemporarilyClosed) {
    return {
      open: false,
      reason: settings.closureReason || 'Temporarily closed',
      storeClosed: true,
    };
  }
  if (dateStr < now.dateStr) return { open: false, reason: 'Past date' };

  const holiday = closedDatesAffecting(
    normalizeClosedDates(settings.closedDates),
    'ORDERS',
  ).find((c) => c.date === dateStr);
  if (holiday) return { open: false, reason: holiday.name ?? 'Holiday' };

  const weekday = DateUtil.getDayOfWeekForDateStr(dateStr);
  const hours = (
    (settings.operatingHours ?? {}) as Record<
      string,
      { open?: string; close?: string } | undefined
    >
  )[WEEKDAY_KEYS[weekday]];
  // No operating hours configured at all means "not set up yet", not
  // "closed every day" — same leniency as a tenant with no settings row.
  const anyHours = Object.values(
    (settings.operatingHours ?? {}) as Record<
      string,
      { open?: string } | undefined
    >,
  ).some((h) => h?.open);
  if (anyHours && (!hours?.open || !hours?.close)) {
    return { open: false, reason: 'Weekly off' };
  }

  if (dateStr === now.dateStr && hours?.close) {
    const closeMinutes = DateUtil.hhmmToMinutes(hours.close);
    const lastOrderMinutes = settings.dailyCutoffTime
      ? Math.min(DateUtil.hhmmToMinutes(settings.dailyCutoffTime), closeMinutes)
      : closeMinutes;
    if (now.minutesSinceMidnight >= lastOrderMinutes) {
      return { open: false, reason: 'Cutoff passed' };
    }
  }
  return { open: true };
}

/** The error an order for a closed day is rejected with. */
export function orderDayClosedMessage(
  dateStr: string,
  availability: Extract<OrderDayAvailability, { open: false }>,
  weekday = DateUtil.getDayOfWeekForDateStr(dateStr),
): string {
  if (availability.storeClosed) {
    return `We're not taking orders right now — ${availability.reason}.`;
  }
  if (availability.reason === 'Weekly off') {
    return `We're closed on ${WEEKDAY_NAMES[weekday]} — please pick another day.`;
  }
  if (availability.reason === 'Cutoff passed') {
    return 'Orders for today are closed — please pick a later day.';
  }
  if (availability.reason === 'Past date') {
    return 'That delivery date has already passed.';
  }
  return `We're closed on ${dateStr} (${availability.reason}) — please pick another date.`;
}
