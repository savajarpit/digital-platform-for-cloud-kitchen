import { PageHeaderSkeleton } from "@/components/account/PageHeaderSkeleton";
import { SubscriptionCardSkeleton } from "@/components/subscriptions/SubscriptionCardSkeleton";

export default function SubscriptionsLoading() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SubscriptionCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
