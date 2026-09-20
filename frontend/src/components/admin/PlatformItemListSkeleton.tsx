import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for the platform Pages / Plans admin lists: the same
 * `card flex flex-col gap-4 p-6` shell wrapping bordered rows with a name +
 * meta on the left and a toggle plus edit/delete icons on the right.
 */
export function PlatformItemListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
