import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the real subscription-card layout in app/account/subscriptions/page.tsx
 * exactly, so the list doesn't jump in height/width once real data replaces it. */
export function SubscriptionCardSkeleton() {
  return (
    <div className="card flex items-center justify-between gap-3 p-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" />
    </div>
  );
}
