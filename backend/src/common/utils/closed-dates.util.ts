import { DateUtil } from './date.util';

export type ClosedDateAppliesTo = 'ORDERS' | 'SUBSCRIPTIONS' | 'BOTH';

export interface ClosedDateEntry {
  /** YYYY-MM-DD, tenant-local. */
  date: string;
  /** Customer-visible label, e.g. "Diwali". */
  name: string | null;
  /** Customer-visible note, shown under the name on the calendar. */
  note: string | null;
  appliesTo: ClosedDateAppliesTo;
}

const APPLIES_TO: ClosedDateAppliesTo[] = ['ORDERS', 'SUBSCRIPTIONS', 'BOTH'];

/** OrderAcceptanceSettings.closedDates is a JSON column that started life as
 * a bare `string[]` of dates. Reads always go through here so both that
 * legacy shape and the current object shape resolve to ClosedDateEntry[].
 * A legacy bare date maps to ORDERS — the only thing it ever affected —
 * so nothing that already-deployed tenants configured starts blocking
 * subscription deliveries they never intended to close. */
export function normalizeClosedDates(raw: unknown): ClosedDateEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: ClosedDateEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      entries.push({ date: item, name: null, note: null, appliesTo: 'ORDERS' });
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      if (typeof o.date !== 'string') continue;
      entries.push({
        date: o.date,
        name: typeof o.name === 'string' && o.name ? o.name : null,
        note: typeof o.note === 'string' && o.note ? o.note : null,
        appliesTo: APPLIES_TO.includes(o.appliesTo as ClosedDateAppliesTo)
          ? (o.appliesTo as ClosedDateAppliesTo)
          : 'ORDERS',
      });
    }
  }
  return entries;
}

/** Dates on which subscription deliveries do not happen — feeds the
 * materializer and the cycleEnd/banking math. */
export function subscriptionClosedDateSet(
  entries: ClosedDateEntry[],
): Set<string> {
  return new Set(
    closedDatesAffecting(entries, 'SUBSCRIPTIONS').map((e) => e.date),
  );
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Customer-visible label for a closure that comes from operating hours. */
export const WEEKLY_OFF_LABEL = 'Weekly off';

/** Weekdays (0=Sun..6=Sat) the kitchen is closed every week: no opening or
 * closing time. Empty when no hours are configured at all — "not set up
 * yet" means open every day, the same leniency orderDayAvailability has. */
export function weeklyOffWeekdays(operatingHours: unknown): Set<number> {
  const hours = (operatingHours ?? {}) as Record<
    string,
    { open?: string; close?: string } | undefined
  >;
  const anyHours = Object.values(hours).some((h) => h?.open);
  if (!anyHours) return new Set();
  const off = new Set<number>();
  WEEKDAY_KEYS.forEach((key, weekday) => {
    if (!hours[key]?.open || !hours[key]?.close) off.add(weekday);
  });
  return off;
}

/**
 * `entries` plus a SUBSCRIPTIONS closure for every weekly-off date in
 * [fromStr, toStr] that isn't already a closed date (an explicit holiday
 * keeps its own name). Subscription code treats a weekly off exactly like a
 * holiday — skipped, and compensated the same way — so expanding it here
 * reaches the materializer, banking, date pickers and calendars at once.
 * Orders never read this: they check operating hours directly.
 */
export function withWeeklyOffClosures(
  entries: ClosedDateEntry[],
  operatingHours: unknown,
  fromStr: string,
  toStr: string,
): ClosedDateEntry[] {
  const off = weeklyOffWeekdays(operatingHours);
  if (off.size === 0) return entries;
  const explicit = new Set(entries.map((e) => e.date));
  const weekly: ClosedDateEntry[] = [];
  for (
    let date = fromStr;
    date <= toStr;
    date = DateUtil.addDaysToDateStr(date, 1)
  ) {
    if (explicit.has(date)) continue;
    if (!off.has(DateUtil.getDayOfWeekForDateStr(date))) continue;
    weekly.push({
      date,
      name: WEEKLY_OFF_LABEL,
      note: null,
      appliesTo: 'SUBSCRIPTIONS',
    });
  }
  return [...entries, ...weekly];
}

export function closedDatesAffecting(
  entries: ClosedDateEntry[],
  target: 'ORDERS' | 'SUBSCRIPTIONS',
): ClosedDateEntry[] {
  return entries.filter(
    (e) => e.appliesTo === 'BOTH' || e.appliesTo === target,
  );
}
