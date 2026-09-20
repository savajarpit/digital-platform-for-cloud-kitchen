import { Skeleton } from "@/components/ui/Skeleton";

/** The address / coupon / pay-button stack inside the plan's purchase card
 * while the customer's addresses are still loading. Renders a fragment so the
 * card's own `gap-4` spaces it exactly like the real fields. */
export function PlanPurchaseFieldsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-[42px] w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[42px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </>
  );
}

/** Mirrors app/plans/[id]/page.tsx: the `lg:grid-cols-[1fr_22rem]` split with
 * title / description / meta row / day cards on the left and the purchase
 * card on the right. */
export function PlanDetailSkeleton() {
  return (
    <main className="container-app flex-1 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {/* h1: text-3xl (36px) */}
          <Skeleton className="h-9 w-64 max-w-full" />
          {/* description: mt-3, two 24px lines */}
          <div className="mt-3">
            <div className="flex h-6 items-center">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex h-6 items-center">
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          {/* meta row: mt-4 text-sm (20px) */}
          <div className="mt-4 flex items-center gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-48 max-w-full" />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4">
                <Skeleton className="h-5 w-28" />
                <div className="mt-3 flex flex-col gap-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 shrink-0" />
                      <div className="min-w-0">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="mt-0.5 h-5 w-40 max-w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card sticky top-24 flex h-fit flex-col gap-4 p-6">
          {/* price: text-3xl (36px); caption: text-xs (16px) */}
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <PlanPurchaseFieldsSkeleton />
        </div>
      </div>
    </main>
  );
}
