import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real subscription-card layout in app/account/subscriptions/page.tsx
 * exactly (including the wrapping title row), so the list doesn't jump in
 * height/width once real data replaces it. */
export function SubscriptionCardSkeleton() {
  return (
    <div className="card flex items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-0.5 h-4 w-40" />
      </div>
      <Skeleton className="h-7 w-16 shrink-0" />
    </div>
  );
}
