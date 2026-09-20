import { PageHeaderSkeleton } from "@/components/account/PageHeaderSkeleton";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";

export default function OrdersLoading() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <PageHeaderSkeleton />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
