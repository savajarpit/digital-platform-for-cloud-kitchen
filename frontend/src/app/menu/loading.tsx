import { Skeleton } from "@/components/ui/Skeleton";
import { MealCardSkeleton } from "@/components/menu/MealCardSkeleton";

export default function MenuLoading() {
  return (
    <main className="container-app flex-1 py-10">
      <Skeleton className="h-8 w-40 sm:h-9 sm:w-56" />
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MealCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
