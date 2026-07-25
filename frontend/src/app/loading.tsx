import { Skeleton } from "@/components/ui/Skeleton";
import { MealCardSkeleton } from "@/components/menu/MealCardSkeleton";

export default function HomeLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="container-app flex flex-col items-center gap-6 py-16 text-center sm:py-24">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-10 w-64 max-w-full sm:h-12 sm:w-80 md:h-14 md:w-96" />
        <Skeleton className="h-5 w-full max-w-md" />
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Skeleton className="h-12 w-full rounded-xl sm:w-36" />
          <Skeleton className="h-12 w-full rounded-xl sm:w-36" />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="container-app pb-20">
        <Skeleton className="h-7 w-48" />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
