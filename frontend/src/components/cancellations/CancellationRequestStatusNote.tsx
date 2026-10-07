"use client";

import { Clock, Info } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  type CancellationRequest,
  withdrawCancellationRequest,
} from "@/lib/api/cancellation-requests";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Where a customer's latest cancellation request stands: pending (with a
 * withdraw action) or declined (with the kitchen's note). Approved requests
 * need no note — the subscription/order itself shows as cancelled.
 */
export function CancellationRequestStatusNote({
  request,
  onChanged,
}: {
  request: CancellationRequest | null;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const { showToast } = useToast();

  if (!request) return null;

  if (request.status === "PENDING") {
    const handleWithdraw = () =>
      confirm({
        title: "Withdraw your request?",
        message: request.heldFromDate
          ? "Your deliveries will resume, and any held days are added to the end of your plan."
          : "Your order will go ahead as planned.",
        confirmLabel: "Withdraw request",
        cancelLabel: "Keep request",
        processingLabel: "Withdrawing…",
        onConfirm: async () => {
          try {
            await withdrawCancellationRequest(request.id);
            showToast("Request withdrawn.", "success");
            onChanged();
          } catch (err) {
            showToast(
              err instanceof ApiError
                ? err.message
                : "Couldn't withdraw the request.",
              "error",
            );
          }
        },
      });

    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <div className="flex gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Cancellation requested</p>
            <p>
              {request.heldFromDate
                ? `Deliveries are on hold from ${formatDay(request.heldFromDate)} while the kitchen reviews it.`
                : "The kitchen is reviewing it — you'll get an email with their answer."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleWithdraw}
          className="btn-outline btn-sm shrink-0 cursor-pointer self-start whitespace-nowrap sm:self-center"
        >
          Withdraw request
        </button>
      </div>
    );
  }

  if (request.status === "REJECTED") {
    return (
      <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            The kitchen declined your cancellation request
          </p>
          {request.resolutionNote && (
            <p className="mt-0.5 wrap-break-word">
              &ldquo;{request.resolutionNote}&rdquo;
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
