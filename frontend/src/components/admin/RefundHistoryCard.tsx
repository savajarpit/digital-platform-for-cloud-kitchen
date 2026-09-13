import type { Refund } from "@/lib/api/refunds";
import { formatPriceFromPaise } from "@/lib/format/currency";

/** Shown on the order/subscriber detail page once cancelled — the
 * cancellation record plus every refund issued against it (normally just
 * one, but the shape allows more than one manual top-up entry later). */
export function RefundHistoryCard({
  cancelledAt,
  cancellationReason,
  refunds,
}: {
  cancelledAt: string | null;
  cancellationReason: string | null;
  refunds: Refund[];
}) {
  if (!cancelledAt && refunds.length === 0) return null;

  return (
    <div className="card flex flex-col gap-2 p-6 text-sm">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Cancelled</h3>
      {cancelledAt && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(cancelledAt).toLocaleString()}</p>
      )}
      {cancellationReason && <p className="text-zinc-600 dark:text-zinc-400">{cancellationReason}</p>}
      {refunds.map((r) => (
        <div key={r.id} className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatPriceFromPaise(r.netRefundInPaise)} refunded
            </span>
            <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{r.method}</span>
          </div>
          <span className="text-zinc-500 dark:text-zinc-400">
            {formatPriceFromPaise(r.amountInPaise)} − {formatPriceFromPaise(r.convenienceFeeInPaise)} fee
          </span>
          {r.razorpayRefundId && <span className="font-mono text-zinc-400">{r.razorpayRefundId}</span>}
          {r.notes && <span className="text-zinc-500 dark:text-zinc-400">{r.notes}</span>}
          <span className="text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
