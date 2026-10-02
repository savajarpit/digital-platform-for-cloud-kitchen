"use client";

import { ApiError, updateOrderStatus } from "@/lib/api/admin-orders";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";

/**
 * Closes a cash/UPI order that was never paid (the customer backed out of a
 * phone order, a walk-in left). No money was taken, so there's nothing to
 * refund; cancelling takes it off the kitchen list and frees its daily stock.
 */
export function CancelUnpaidOrderButton({
  orderId,
  orderNumber,
  onCancelled,
}: {
  orderId: string;
  orderNumber: string;
  onCancelled: () => void;
}) {
  const confirm = useConfirm();
  const { showToast } = useToast();

  function handleClick() {
    confirm({
      title: "Cancel this order?",
      message: `Order ${orderNumber} hasn't been paid, so nothing will be refunded. It will be removed from the kitchen list. This can't be undone.`,
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      processingLabel: "Cancelling…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await updateOrderStatus(orderId, "CANCELLED");
          showToast("Order cancelled", "success");
          onCancelled();
        } catch (err) {
          showToast(
            err instanceof ApiError
              ? err.message
              : "Couldn't cancel this order.",
            "error",
          );
        }
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-outline btn-sm cursor-pointer whitespace-nowrap border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
    >
      Cancel order
    </button>
  );
}
