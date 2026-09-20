import { Skeleton } from "@/components/ui/Skeleton";
import { PlanCardSkeleton } from "@/components/subscriptions/PlanCardSkeleton";

/** Mirrors plans/page.tsx: gradient header (`py-12`, centered title +
 * subtitle), then the `bg-zinc-50` body with the 1/2/3-column plan grid. */
export default function PlansLoading() {
  return (
    <main className="flex-1">
      <div className="bg-linear-to-br from-primary-50 to-white py-12 dark:from-primary-950 dark:to-zinc-950">
        <div className="container-app text-center">
          <Skeleton className="mx-auto h-8 w-64 max-w-full sm:h-9" />
          <Skeleton className="mx-auto mt-3 h-6 w-full max-w-xl" />
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-950">
        <div className="container-app py-12">
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PlanCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
