import { DateUtil } from './date.util';

export interface DateRangeQuery {
  days?: number;
  from?: string;
  to?: string;
}

export interface ResolvedDateRange {
  queryStart: Date;
  queryEnd: Date;
  bucketStartStr: string;
  bucketEndStr: string;
}

const DEFAULT_TREND_DAYS = 14;

/**
 * Shared range-resolving/bucketing math for any admin analytics dashboard
 * (first built for OrdersService.getOverview, generalized here so
 * SubscriptionsService's own analytics reuses the exact same date-boundary
 * handling instead of a second hand-rolled copy — this logic has genuinely
 * subtle timezone edges, see resolveRange's own comment).
 */
export class AnalyticsRangeUtil {
  /**
   * Two different concerns need two different kinds of boundary: the DB
   * query needs real `Date` instants, widened by a day on each side so no
   * tenant timezone offset (UTC-12..+14) can clip a row — bucketByDay drops
   * anything outside the exact bucket range anyway, so over-fetching here
   * is harmless. The chart buckets need exact tenant-local calendar-date
   * *strings* — computing those from the widened Date objects instead
   * would silently roll into the next day for any timezone ahead of UTC;
   * the strings are the source of truth, never round-tripped through a Date.
   */
  static resolveRange(
    query: DateRangeQuery,
    now: Date,
    timezone: string,
  ): ResolvedDateRange {
    if (query.from && query.to && query.to >= query.from) {
      return {
        queryStart: DateUtil.addDays(
          new Date(`${query.from}T00:00:00.000Z`),
          -1,
        ),
        queryEnd: DateUtil.addDays(new Date(`${query.to}T23:59:59.999Z`), 1),
        bucketStartStr: query.from,
        bucketEndStr: query.to,
      };
    }
    const days = query.days ?? DEFAULT_TREND_DAYS;
    const rangeStart = DateUtil.addDays(now, -(days - 1));
    return {
      queryStart: rangeStart,
      queryEnd: now,
      bucketStartStr: DateUtil.toTenantDateStr(rangeStart, timezone),
      bucketEndStr: DateUtil.toTenantDateStr(now, timezone),
    };
  }

  static sumInWindow<T extends { createdAt: Date }>(
    rows: T[],
    since: Date,
    valueOf: (row: T) => number,
  ): { count: number; valueInPaise: number } {
    const inWindow = rows.filter((r) => r.createdAt >= since);
    return {
      count: inWindow.length,
      valueInPaise: inWindow.reduce((sum, r) => sum + valueOf(r), 0),
    };
  }

  static bucketByDay<T extends { createdAt: Date }>(
    rows: T[],
    timezone: string,
    bucketStartStr: string,
    bucketEndStr: string,
    valueOf: (row: T) => number,
  ): { date: string; count: number; valueInPaise: number }[] {
    const buckets = new Map<string, { count: number; valueInPaise: number }>();
    const dateStrs = DateUtil.enumerateDateStrs(bucketStartStr, bucketEndStr);
    for (const dateStr of dateStrs) {
      buckets.set(dateStr, { count: 0, valueInPaise: 0 });
    }
    for (const row of rows) {
      const bucket = buckets.get(
        DateUtil.toTenantDateStr(row.createdAt, timezone),
      );
      if (!bucket) continue; // outside the seeded window (timezone-edge row) — drop, not a ledger
      bucket.count += 1;
      bucket.valueInPaise += valueOf(row);
    }
    return Array.from(buckets, ([date, stats]) => ({ date, ...stats }));
  }
}
