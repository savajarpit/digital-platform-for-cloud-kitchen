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

/** The month card of PlanCalendarSection / DeliveryDateSelector: title +
 * nav, weekday row, date boxes (same heights as PlanDayCell) and legend. */
function CalendarCardSkeleton() {
  return (
    <div className="card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`w${i}`} className="flex justify-center pb-1">
            <Skeleton className="h-3 w-6 sm:w-8" />
          </div>
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <Skeleton key={i} className="h-18 w-full rounded-xl sm:h-20" />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
  );
}

function DayCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
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
  );
}

/** Mirrors app/plans/[id]/page.tsx: title and meta row across the top, then
 * PlanPageColumns — the calendar (or the day list) on the left, and the rail
 * with the purchase card (plus the day-details card on desktop, for a
 * calendar) on the right. */
export function PlanDetailSkeleton({ calendar }: { calendar: boolean }) {
  return (
    <main className="container-app flex-1 pt-8 pb-28 sm:pt-12 lg:pb-12">
      {/* h1: text-2xl / sm:text-3xl */}
      <Skeleton className="h-8 w-64 max-w-full sm:h-9" />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-48 max-w-full" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0">
          {calendar ? <CalendarCardSkeleton /> : <DayCardsSkeleton />}
        </div>

        <div className="flex flex-col gap-4 lg:self-start">
          <div className="card flex flex-col gap-4 p-5 sm:p-6">
            {/* price: text-3xl (36px); caption: text-xs (16px) */}
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <PlanPurchaseFieldsSkeleton />
          </div>
          {calendar && (
            <div className="card hidden flex-col gap-3 p-5 lg:flex">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl p-2.5"
                >
                  <Skeleton className="h-12 w-12 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-32 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
