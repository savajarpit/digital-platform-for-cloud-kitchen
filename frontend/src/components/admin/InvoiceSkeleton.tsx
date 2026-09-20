import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the admin invoice: back/print bar, then the `card p-8` sheet with
 * header, billed-to / payment grid, items table and totals block. */
export function InvoiceSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="card mt-6 p-8">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="flex max-w-xs flex-col gap-1.5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Skeleton className="h-3 w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>

        <div className="mt-4 ml-auto flex max-w-60 flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
