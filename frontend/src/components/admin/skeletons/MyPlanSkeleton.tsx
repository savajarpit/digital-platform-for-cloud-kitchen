import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Body of the My Plan page (below the title): the "Current plan" card and
 * the `sm:2 / lg:3` grid of switchable plan cards, same paddings as real.
 */
export function MyPlanSkeleton() {
  return (
    <>
      <div className="card flex flex-col gap-2 p-6" aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-28" />
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </>
  );
}
