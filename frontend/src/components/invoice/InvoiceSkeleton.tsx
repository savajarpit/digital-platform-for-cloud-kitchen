import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the printable invoice pages (orders/[id]/invoice and
 * account/subscriptions/[id]/invoice): toolbar row, then a `max-w-2xl` card
 * with letterhead, two info columns, the line-item table and the totals
 * block. `itemRows`/`summaryRows` match how many lines the real invoice
 * usually has; `wideTable` is the 4-column order table vs the 2-column
 * subscription one. */
export function InvoiceSkeleton({
  itemRows = 2,
  summaryRows = 3,
  wideTable = true,
}: {
  itemRows?: number;
  summaryRows?: number;
  wideTable?: boolean;
}) {
  return (
    <main className="container-app flex-1 py-10">
      {/* toolbar: back link | Print (btn-sm, 32px) */}
      <div className="mx-auto flex h-8 max-w-2xl items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>

      <div className="card mx-auto mt-6 max-w-2xl p-8">
        {/* letterhead: business name + address lines | title + meta */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="min-w-0 max-w-xs flex-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-1 h-4 w-48 max-w-full" />
            <Skeleton className="mt-1 h-4 w-36 max-w-full" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="mt-1 h-4 w-32" />
            <Skeleton className="mt-1 h-4 w-24" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="mt-1 h-5 w-2/3" />
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: itemRows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2.5 dark:border-zinc-800"
            >
              <Skeleton className="h-5 w-40 max-w-full flex-1" />
              {wideTable && <Skeleton className="h-5 w-8" />}
              {wideTable && <Skeleton className="h-5 w-14" />}
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-4 ml-auto flex max-w-60 flex-col gap-1.5">
          {Array.from({ length: summaryRows }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
