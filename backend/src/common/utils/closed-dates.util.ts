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

export function closedDatesAffecting(
  entries: ClosedDateEntry[],
  target: 'ORDERS' | 'SUBSCRIPTIONS',
): ClosedDateEntry[] {
  return entries.filter(
    (e) => e.appliesTo === 'BOTH' || e.appliesTo === target,
  );
}
