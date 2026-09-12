import { OrderDetailSkeleton } from "@/components/orders/OrderDetailSkeleton";

/** Route-level fallback. The checkout → `/orders/[id]` redirect happens
 * inside the Razorpay success callback, so the segment is never
 * prefetched — without this the user stares at a blank frame while the
 * chunk downloads. */
export default function OrderDetailLoading() {
  return <OrderDetailSkeleton />;
}
