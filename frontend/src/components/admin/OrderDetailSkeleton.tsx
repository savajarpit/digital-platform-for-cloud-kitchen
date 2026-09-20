import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the admin order detail layout: top bar, title row, then the
 * items card (2/3) beside the customer / delivery / payment column (1/3). */
export function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-16" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
          <div className="mt-2 flex flex-col gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card flex flex-col gap-2 p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="card flex flex-col gap-2 p-6">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
