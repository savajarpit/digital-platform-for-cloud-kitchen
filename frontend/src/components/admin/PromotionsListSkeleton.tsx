import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for a Coupons / Promotions card: the same `card p-6` shell,
 * heading + "Add" button row, then bordered list rows (`px-3.5 py-2.5`) with
 * a name line (plus a description line for promotions) and toggle / icon
 * controls on the right.
 */
export function PromotionsListSkeleton({
  rows = 3,
  twoLine = false,
}: {
  rows?: number;
  twoLine?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-64 max-w-full" />
              {twoLine && <Skeleton className="h-4 w-80 max-w-full" />}
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
