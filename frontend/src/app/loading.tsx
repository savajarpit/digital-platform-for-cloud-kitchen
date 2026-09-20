import { Skeleton } from "@/components/ui/Skeleton";
import { MealCardSkeleton } from "@/components/menu/MealCardSkeleton";

/**
 * Mirrors home/page.tsx: Hero (gradient section, 2-column with the image
 * collage from `lg`), then the `bg-zinc-50` wrapper holding sections with
 * the same `py-16 sm:py-20` rhythm and 1/2/4-column meal grid. Hero image
 * presence is per-tenant, so the collage column is assumed (it is hidden
 * below `lg` in the real Hero as well).
 */
export default function HomeLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-zinc-950 dark:to-zinc-900" />
        <div className="container-app relative grid items-center gap-10 py-16 text-center sm:py-24 lg:grid-cols-2 lg:text-left">
          <div className="flex flex-col items-center gap-6 lg:items-start">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-9 w-full max-w-md sm:h-12 md:h-15" />
            <Skeleton className="h-6 w-full max-w-md" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-13 w-full rounded-xl sm:w-44" />
              <Skeleton className="h-13 w-full rounded-xl sm:w-44" />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-3xl" />
                <Skeleton className="aspect-4/5 w-full rounded-3xl" />
              </div>
              <div className="space-y-4 pt-8">
                <Skeleton className="aspect-4/5 w-full rounded-3xl" />
                <Skeleton className="aspect-square w-full rounded-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-zinc-50 dark:bg-zinc-950">
        <section className="container-app py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <Skeleton className="h-8 w-56 sm:h-9" />
              <Skeleton className="mt-2 h-5 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <MealCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
