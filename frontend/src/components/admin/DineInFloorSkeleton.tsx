import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors DineInFloorView: "Tables" header + New Order button, the table
 * grid card (same 2/3/4/5-column breakpoints, h-24 tiles), then the waitlist
 * card (form row + entries). */
export function DineInFloorSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-[42px] w-36 rounded-xl" />
          <Skeleton className="h-[42px] w-36 rounded-xl" />
          <Skeleton className="h-[42px] w-20 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
          >
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors TableManagementPanel: heading, add-table form row, table rows. */
export function DineInTablesSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-[42px] w-40 rounded-xl" />
        <Skeleton className="h-[42px] w-20 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
