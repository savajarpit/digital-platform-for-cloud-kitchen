import { Skeleton } from "@/components/ui/Skeleton";

/** Rows of a `divide-y` list inside a card (`py-3` rows, label + chevron). */
export function DividedListSkeleton({ rows = 3, lines = 1 }: { rows?: number; lines?: number }) {
  return (
    <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-4" />
          </div>
          {Array.from({ length: lines - 1 }).map((_, l) => (
            <Skeleton key={l} className="h-4 w-2/3" />
          ))}
        </div>
      ))}
    </div>
  );
}
