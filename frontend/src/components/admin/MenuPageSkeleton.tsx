import { Skeleton } from "@/components/ui/Skeleton";
import { MealListSkeleton } from "@/components/admin/MealListSkeleton";

/** Mirrors the Menu page: categories card (rows + add form) then the meals
 * card (header, search/filter row, meal grid). */
export function MenuPageSkeleton() {
  return (
    <>
      <div className="card flex flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-5 w-24" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[42px] w-full" />
          ))}
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-6" aria-busy="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-[42px] min-w-48 flex-1 rounded-xl" />
          <Skeleton className="h-[42px] w-28 rounded-xl" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <MealListSkeleton />
      </div>
    </>
  );
}
