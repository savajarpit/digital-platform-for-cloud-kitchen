import { Skeleton } from "@/components/ui/Skeleton";

/** Same grid + `card flex gap-3 p-4` shell as MealListItem: 64px thumbnail,
 * name / meta lines, then the toggle + icon row. */
export function MealListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex gap-3 p-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
