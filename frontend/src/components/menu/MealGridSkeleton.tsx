import { MealCardSkeleton } from "./MealCardSkeleton";

/** The menu's meal grid as skeleton cards - the SAME 1/2/3/4-column grid
 * classes as MenuBrowser's real grid, so it can stand in for the results
 * (route loading, or while a new search/filter is fetching) without any
 * layout shift. */
export function MealGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <MealCardSkeleton key={i} />
      ))}
    </div>
  );
}
