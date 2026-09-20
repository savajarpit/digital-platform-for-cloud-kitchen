import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors app/account/subscriptions/[id]/page.tsx for an ACTIVE subscription
 * (the common case): back link, summary card, then the `lg:grid-cols-2`
 * split — upcoming days on the left, pause + cancel cards on the right. */
export function SubscriptionDetailSkeleton() {
  return (
    <main className="container-app flex-1 py-10">
      {/* back link: mb-4 flex text-sm (20px) */}
      <div className="mb-4 flex h-5 items-center">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* summary card: title row (28px) + subtitle (20px) | invoice button */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-1 h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card flex flex-col gap-3 p-5">
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[58px] w-full" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-56 max-w-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-[42px] w-full rounded-xl" />
                </div>
              ))}
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>

          <div className="card flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-9 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
