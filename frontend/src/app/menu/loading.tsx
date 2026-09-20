import { Skeleton } from "@/components/ui/Skeleton";
import { MealCardSkeleton } from "@/components/menu/MealCardSkeleton";

/** Mirrors menu/page.tsx + MenuBrowser: title, category pills, the
 * search/sort/chips toolbar, then the 1/2/3/4-column grid. */
export default function MenuLoading() {
  return (
    <main className="container-app flex-1 py-10">
      <Skeleton className="h-8 w-40 sm:h-9 sm:w-56" />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Skeleton className="h-10.5 min-w-56 flex-1 rounded-xl" />
        <Skeleton className="h-10.5 w-44 rounded-xl" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MealCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
