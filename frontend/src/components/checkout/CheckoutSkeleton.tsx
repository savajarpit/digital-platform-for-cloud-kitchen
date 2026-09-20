import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors app/checkout/page.tsx block-for-block (title, the
 * `lg:grid-cols-3` split, the address / time / notes / terms cards on the
 * left and the order-summary card on the right). Shown while the empty-cart
 * redirect is in flight so the route never flashes blank. */
export function CheckoutSkeleton() {
  return (
    <main className="container-app flex-1 py-10">
      {/* h1: text-2xl / sm:text-3xl */}
      <Skeleton className="h-8 w-40 sm:h-9" />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* address card */}
          <section className="card p-6">
            <Skeleton className="mb-4 h-6 w-44" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <Skeleton className="mt-1 h-4 w-4 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="mt-1 h-5 w-full" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-9 w-36 rounded-xl" />
          </section>

          {/* delivery time card */}
          <section className="card p-6">
            <Skeleton className="mb-3 h-6 w-36" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-[42px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          </section>

          {/* notes card */}
          <section className="card flex flex-col gap-4 p-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-5 w-40" />
                <Skeleton className="h-[62px] w-full rounded-xl" />
              </div>
            ))}
          </section>

          {/* terms card */}
          <section className="card p-6">
            <div className="flex items-start gap-2">
              <Skeleton className="mt-0.5 h-4 w-4" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
          </section>
        </div>

        {/* order summary card */}
        <div className="card h-fit p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-[42px] flex-1 rounded-xl" />
                <Skeleton className="h-11 w-20 shrink-0 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
            <div className="mt-1 flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>

          <Skeleton className="mt-6 h-10 w-full rounded-xl" />
          <div className="mt-3 flex justify-center">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </main>
  );
}
