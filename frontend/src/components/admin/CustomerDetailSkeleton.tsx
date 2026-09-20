import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the admin customer detail layout: back link, header, contact +
 * addresses grid, then the two list cards. */
export function CustomerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-5 w-36" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, c) => (
        <div key={c} className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[58px] w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
