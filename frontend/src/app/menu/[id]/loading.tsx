import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors menu/[id]/page.tsx: back link, then `lg:grid-cols-2` with a
 * square gallery (as in MealGallery) beside the details column. */
export default function MealDetailLoading() {
  return (
    <main className="container-app flex-1 py-10">
      <Skeleton className="h-5 w-20" />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12.75 w-full" />
            ))}
          </div>

          <Skeleton className="h-8 w-28" />

          <div className="pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
