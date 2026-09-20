import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for the platform cancellation-request / lead lists: the same
 * `card flex flex-col gap-2 p-6` shell holding bordered rows shaped like
 * PlatformCancellationRequestRow / PlatformLeadRow (title + badge, meta line,
 * action buttons on the right from `sm` up).
 */
export function PlatformRowListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card flex flex-col gap-2 p-6" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
