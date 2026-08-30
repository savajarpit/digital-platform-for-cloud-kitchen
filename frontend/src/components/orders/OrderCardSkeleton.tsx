import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real order-card layout in app/orders/page.tsx exactly, so the
 * list doesn't jump in height/width once real data replaces it. */
export function OrderCardSkeleton() {
  return (
    <div className="card flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
      <div className="flex w-full flex-1 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col items-start gap-1.5 md:items-end">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
    </div>
  );
}
