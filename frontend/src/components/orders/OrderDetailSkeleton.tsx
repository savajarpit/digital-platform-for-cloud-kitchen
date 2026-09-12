import { Skeleton } from "@/components/ui/Skeleton";

/** Shared loading state for the order-detail screen. Used both as the
 * route-level `loading.tsx` (shown instantly while the segment JS loads
 * during the checkout → order redirect) and as the in-page fallback while
 * `getOrder` is in flight — same markup in both spots so there's no
 * layout shift when the real data lands. Mirrors the real page: back
 * link, centered card with status icon, stepper, order number, and two
 * info blocks. */
export function OrderDetailSkeleton() {
  return (
    <main className="container-app flex-1 py-16">
      <Skeleton className="mx-auto mb-4 h-4 w-32 max-w-xl" />

      <div className="card mx-auto max-w-xl p-8">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-6 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
        <Skeleton className="mx-auto mt-3 h-6 w-24 rounded-full" />

        <div className="mt-6 flex justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>

        <Skeleton className="mx-auto mt-6 h-4 w-40" />

        <div className="mt-6 flex flex-col gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-2 h-5 w-full" />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </main>
  );
}
