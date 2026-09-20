import { Skeleton } from "@/components/ui/Skeleton";

/** Stand-in for a `TimeInput12h`: hour / minute / AM-PM selects. */
function TimeSkeleton() {
  return (
    <div className="flex items-center gap-1">
      <Skeleton className="h-[42px] w-[4.5rem] rounded-xl" />
      <Skeleton className="h-[42px] w-[4.5rem] rounded-xl" />
      <Skeleton className="h-[42px] w-[4.5rem] rounded-xl" />
    </div>
  );
}

/**
 * Mirrors the Order Hours page: title, "Temporarily closed" card, the seven
 * operating-hours rows + cutoff, closed dates, save button and the instant
 * delivery card — same `card p-6` shells and row layout as the real form.
 */
export function OrderHoursSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-28 shrink-0" />
            <TimeSkeleton />
            <Skeleton className="h-4 w-4" />
            <TimeSkeleton />
          </div>
        ))}
        <div className="flex flex-col gap-1 pt-2">
          <Skeleton className="h-5 w-32" />
          <TimeSkeleton />
          <Skeleton className="mt-1 h-4 w-96 max-w-full" />
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-[42px] w-48 rounded-xl" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-10 w-36 rounded-xl" />

      <div className="card flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
