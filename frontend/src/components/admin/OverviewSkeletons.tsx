import { Skeleton } from "@/components/ui/Skeleton";

// Deterministic heights so the placeholder reads like a real trend.
const BAR_HEIGHTS = [35, 55, 40, 70, 60, 85, 45, 65, 50, 90, 55, 75, 40, 60];

/** Body + footer of the Revenue card: the same `pt-14` reserve above a
 * `h-36` bar row (w-6 bars, gap-1, like the 14-day default), the date-label
 * row and the totals strip. */
export function RevenueChartSkeleton() {
  return (
    <>
      <div className="overflow-x-auto pt-14 pb-1" aria-busy="true">
        <div className="flex h-36 items-end gap-1">
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} className="w-6 shrink-0" style={{ height: `${h}%` }}>
              <Skeleton className="h-full w-full rounded-b-none" />
            </div>
          ))}
        </div>
        <div className="mt-1 h-[15px]" />
      </div>
      <div className="flex flex-wrap items-center gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

/** Label / bar / count rows shared by "Orders by Status" and "Top Meals". */
export function BarRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-32 shrink-0" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}
