import { Skeleton } from "@/components/ui/Skeleton";

/** Shared loading state for the order-detail screen. Used both as the
 * route-level `loading.tsx` (shown instantly while the segment JS loads
 * during the checkout → order redirect) and as the in-page fallback while
 * `getOrder` is in flight — same markup in both spots so there's no
 * layout shift when the real data lands. Mirrors the real page block-for-
 * block: back link row, centered card with status icon, title, badge,
 * stepper, order number, and the two info blocks + action buttons. */
export function OrderDetailSkeleton() {
  return (
    <main className="container-app flex-1 py-16">
      {/* back link: mx-auto mb-4 flex max-w-xl, text-sm (20px) */}
      <div className="mx-auto mb-4 flex h-5 max-w-xl items-center">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="card mx-auto max-w-xl p-8 text-center">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        {/* title: mt-4 text-xl (28px); subtitle: mt-1 text-sm (20px) */}
        <Skeleton className="mx-auto mt-4 h-7 w-48" />
        <Skeleton className="mx-auto mt-1 h-5 w-64 max-w-full" />
        {/* status badge: mt-3, 24px */}
        <Skeleton className="mx-auto mt-3 h-6 w-24 rounded-full" />

        <div className="mt-6 flex justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>

        {/* order number: mt-4 text-sm */}
        <Skeleton className="mx-auto mt-4 h-5 w-40" />

        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
          <Skeleton className="mb-1 h-5 w-20" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="mt-2 h-6 w-full" />
        </div>

        {/* actions: btn-outline (44px), btn-outline (44px), btn-primary (40px) */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
