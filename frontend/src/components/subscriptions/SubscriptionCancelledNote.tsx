import { XCircle } from "lucide-react";
import type { SubscriptionDetail } from "@/lib/api/subscriptions";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";

/** What a customer needs once their plan is cancelled: when, and what they
 * got back — whether they asked for it or the kitchen cancelled it. */
export function SubscriptionCancelledNote({
  subscription,
}: {
  subscription: SubscriptionDetail;
}) {
  const refunded = subscription.refunds.reduce(
    (sum, r) => sum + r.netRefundInPaise,
    0,
  );
  const viaRazorpay = subscription.refunds.some(
    (r) => r.method === "RAZORPAY" && r.netRefundInPaise > 0,
  );

  return (
    <div className="card mt-6 flex items-start gap-3 p-5 text-sm">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          This plan was cancelled
          {subscription.cancelledAt &&
            ` on ${formatDate(subscription.cancelledAt)}`}
          .
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          {refunded === 0
            ? "No refund was due for this plan."
            : viaRazorpay
              ? `${formatPriceFromPaise(refunded)} is being refunded to your original payment method — it usually shows up in 5–7 working days.`
              : `The kitchen has refunded ${formatPriceFromPaise(refunded)}. Contact them if you haven't received it.`}
        </p>
      </div>
    </div>
  );
}
