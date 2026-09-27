import { DateUtil } from './date.util';

export interface PrepCandidate {
  startDate: Date | null;
  cycleEnd: Date | null;
  usesDateSelection: boolean;
  /** Scheduled rows on the date being checked (only needed for date selection). */
  scheduledDates: { date: string }[];
  /** Skips covering the date being checked. */
  skips: { dateFrom: string; dateTo: string }[];
}

/** Whether an ACTIVE subscriber actually gets a delivery on `dateStr` — the
 * same gates the nightly materializer applies before cooking anything:
 * inside [startDate, cycleEnd] (tenant-local), not skipped/paused that day,
 * and, for a date-selection subscriber, `dateStr` is one of their dates. */
export function deliversOn(
  sub: PrepCandidate,
  dateStr: string,
  timezone: string,
): boolean {
  if (!sub.startDate || !sub.cycleEnd) return false;
  const start = DateUtil.toTenantDateStr(sub.startDate, timezone);
  const end = DateUtil.toTenantDateStr(sub.cycleEnd, timezone);
  if (dateStr < start || dateStr > end) return false;
  if (sub.skips.some((s) => s.dateFrom <= dateStr && dateStr <= s.dateTo)) {
    return false;
  }
  if (sub.usesDateSelection) {
    return sub.scheduledDates.some((s) => s.date === dateStr);
  }
  return true;
}
