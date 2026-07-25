import { Skeleton } from "@/components/ui/Skeleton";

export function MealCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
