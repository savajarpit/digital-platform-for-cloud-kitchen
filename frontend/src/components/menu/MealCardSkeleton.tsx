import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Structurally mirrors MealCard.tsx (same flex chain, same paddings, block
 * heights taken from the real line-heights) so cards don't jump in width or
 * height when real content replaces the skeleton, at any breakpoint. Grid
 * items stretch to the tallest card in their row, so the two need matching
 * flex plumbing, not just similar-looking placeholder blocks.
 */
export function MealCardSkeleton() {
  return (
    <div className="card flex flex-col overflow-hidden" aria-busy="true">
      <div className="relative aspect-4/3 w-full">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>

      <div className="flex flex-1 flex-col p-4 pb-0">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Skeleton className="h-5.5 w-3/4" />
        </div>
        <div className="mb-3 flex-1 space-y-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>

        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11.75 w-full" />
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}
