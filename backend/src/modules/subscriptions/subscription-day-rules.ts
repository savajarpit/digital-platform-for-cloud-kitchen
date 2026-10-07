import { DateUtil } from '../../common/utils/date.util';

/** Longest pause a customer (or staff on their behalf) can set in one go. */
export const MAX_PAUSE_DAYS = 30;

/** Which days a subscription actually delivers on, as plain date strings
 * (tenant-local YYYY-MM-DD) — built once per request by the service, so the
 * skip/pause rules below stay pure and testable. */
export interface DeliveryCalendar {
  startStr: string;
  cycleEndStr: string;
  /** A real delivery day of the plan: a chosen date for a date-selection
   * subscriber, a weekday with meals for a WEEKLY_FIXED plan, any day for
   * a RELATIVE_DAY plan. Closures and skips are checked separately. */
  isPlanDay: (dateStr: string) => boolean;
  closed: ReadonlySet<string>;
  skipped: ReadonlySet<string>;
  /** A pending cancellation request's hold date: nothing is delivered from
   * then on, so nothing can be skipped, paused, changed or moved there. */
  heldFrom: string | null;
}

/** Why `dateStr` is untouchable because of a pending cancellation request,
 * or null. */
export function holdError(
  cal: DeliveryCalendar,
  dateStr: string,
): string | null {
  if (!cal.heldFrom || dateStr < cal.heldFrom) return null;
  return `Deliveries are on hold from ${DateUtil.formatDateStrShort(cal.heldFrom)} while the cancellation request is reviewed — withdraw it (or have the kitchen answer it) to make changes.`;
}

/** Why `dateStr` can't be skipped, or null when it can. Every rejected case
 * would otherwise bank a free extra delivery for a day that was never going
 * to be delivered. */
export function skipDateError(
  cal: DeliveryCalendar,
  dateStr: string,
): string | null {
  const held = holdError(cal, dateStr);
  if (held) return held;
  if (cal.closed.has(dateStr)) {
    return 'The kitchen is closed on that date, so there is no delivery to skip.';
  }
  if (dateStr < cal.startStr || dateStr > cal.cycleEndStr) {
    return "That day isn't part of this plan.";
  }
  if (!cal.isPlanDay(dateStr)) {
    return "There's no delivery on that day in this plan.";
  }
  if (cal.skipped.has(dateStr)) return 'That day is already skipped.';
  return null;
}

/** The deliveries a pause over [fromStr, toStr] actually stops: plan days
 * inside the subscription's dates that aren't closed or already skipped.
 * This count is what gets credited back — never the calendar length. */
export function pausedDeliveryDays(
  cal: DeliveryCalendar,
  fromStr: string,
  toStr: string,
): string[] {
  return DateUtil.enumerateDateStrs(fromStr, toStr).filter(
    (d) =>
      d >= cal.startStr &&
      d <= cal.cycleEndStr &&
      cal.isPlanDay(d) &&
      !cal.closed.has(d) &&
      !cal.skipped.has(d),
  );
}

/** Why a pause over [fromStr, toStr] isn't allowed, or null when it is. */
export function pauseRangeError(
  cal: DeliveryCalendar,
  fromStr: string,
  toStr: string,
): string | null {
  if (toStr < fromStr) return 'The pause has to end on or after its start.';
  if (DateUtil.diffInDays(fromStr, toStr) + 1 > MAX_PAUSE_DAYS) {
    return `A pause can be at most ${MAX_PAUSE_DAYS} days.`;
  }
  if (fromStr < cal.startStr || fromStr > cal.cycleEndStr) {
    return 'A pause has to start on a day within the plan.';
  }
  const held = holdError(cal, toStr);
  if (held) return held;
  if (pausedDeliveryDays(cal, fromStr, toStr).length === 0) {
    return 'There are no deliveries to pause on those dates.';
  }
  return null;
}

/** Every date covered by the subscription's existing skips and pauses. A
 * malformed stored range (saved before dates were validated strictly) is
 * ignored rather than breaking every later skip. */
export function skippedDateSet(
  skips: { dateFrom: string; dateTo: string }[],
): Set<string> {
  return new Set(
    skips
      .filter(
        (s) =>
          DateUtil.isValidDateStr(s.dateFrom) &&
          DateUtil.isValidDateStr(s.dateTo),
      )
      .flatMap((s) => DateUtil.enumerateDateStrs(s.dateFrom, s.dateTo)),
  );
}
