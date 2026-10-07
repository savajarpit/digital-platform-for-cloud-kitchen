import { DateUtil } from '../../common/utils/date.util';

/** One sale on the Overview dashboard: a paid food order, or a plan
 * purchase. A subscription's daily deliveries are never a sale — the plan's
 * price already was, the day it was bought. */
export interface RevenueRow {
  createdAt: Date;
  amountInPaise: number;
  kind: 'order' | 'plan';
}

export interface RevenueTotals {
  orders: number;
  plans: number;
  revenueInPaise: number;
}

function emptyTotals(): RevenueTotals {
  return { orders: 0, plans: 0, revenueInPaise: 0 };
}

function add(totals: RevenueTotals, row: RevenueRow): void {
  if (row.kind === 'order') totals.orders += 1;
  else totals.plans += 1;
  totals.revenueInPaise += row.amountInPaise;
}

export function toRevenueRows(
  orders: { createdAt: Date; totalInPaise: number }[],
  plans: { createdAt: Date; priceInPaiseSnapshot: number }[],
): RevenueRow[] {
  return [
    ...orders.map((o) => ({
      createdAt: o.createdAt,
      amountInPaise: o.totalInPaise,
      kind: 'order' as const,
    })),
    ...plans.map((p) => ({
      createdAt: p.createdAt,
      amountInPaise: p.priceInPaiseSnapshot,
      kind: 'plan' as const,
    })),
  ];
}

export function sumRevenueSince(
  rows: RevenueRow[],
  since: Date,
): RevenueTotals {
  const totals = emptyTotals();
  for (const row of rows) if (row.createdAt >= since) add(totals, row);
  return totals;
}

/** Per tenant-local day over [bucketStartStr, bucketEndStr]; a row outside
 * the seeded days (timezone edge of the widened query) is dropped. */
export function bucketRevenueByDay(
  rows: RevenueRow[],
  timezone: string,
  bucketStartStr: string,
  bucketEndStr: string,
): ({ date: string } & RevenueTotals)[] {
  const buckets = new Map<string, RevenueTotals>();
  for (const dateStr of DateUtil.enumerateDateStrs(
    bucketStartStr,
    bucketEndStr,
  )) {
    buckets.set(dateStr, emptyTotals());
  }
  for (const row of rows) {
    const bucket = buckets.get(
      DateUtil.toTenantDateStr(row.createdAt, timezone),
    );
    if (bucket) add(bucket, row);
  }
  return Array.from(buckets, ([date, totals]) => ({ date, ...totals }));
}
