import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Structurally mirrors MealCard.tsx (same flex chain, same spacing, same
 * conditional-shaped blocks) so cards don't jump in width/height when real
 * content replaces the skeleton, at any breakpoint — grid items stretch to
 * the tallest card in their row, so the two need matching flex plumbing,
 * not just similar-looking placeholder blocks.
 */
export function MealCardSkeleton() {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="relative aspect-4/3 w-full">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-1 h-5 w-3/4" />
        <div className="mb-3 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>

        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}
