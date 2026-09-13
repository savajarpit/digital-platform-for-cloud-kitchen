"use client";

import { useEffect, useState } from "react";
import { ApiError, cancelOrderRefund } from "@/lib/api/admin-orders";
import {
  cancelSubscriptionRefund,
  getRefundPreview,
  type RefundPreview,
} from "@/lib/api/admin-subscriptions";
import type { CancelRefundInput, RefundMethod } from "@/lib/api/refunds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { useToast } from "@/context/ToastContext";

/** Inline expand/collapse form (no Modal component in this codebase, same
 * pattern as DeclareDisruptionForm) for the admin cancel+refund action —
 * shared by a one-off order and a subscription, since both endpoints take
 * the same {method, amountInPaise, convenienceFeeInPaise, reason, notes}
 * shape. For a subscription, fetches the pending-days refund-preview on
 * open and uses its suggested amount as the starting value; for an order
 * the starting value is simply the order's own total. */
export function CancelRefundForm({
  kind,
  id,
  defaultAmountInPaise,
  onCancelled,
}: {
  kind: "order" | "subscription";
  id: string;
  defaultAmountInPaise: number;
  onCancelled: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [method, setMethod] = useState<RefundMethod>("MANUAL");
  const [amountRupees, setAmountRupees] = useState(String(defaultAmountInPaise / 100));
  const [feeRupees, setFeeRupees] = useState("0");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || kind !== "subscription") return;
    getRefundPreview(id)
      .then((p) => {
        setPreview(p);
        setAmountRupees(String(p.suggestedAmountInPaise / 100));
      })
      .catch(() => showToast("Couldn't load the suggested refund amount.", "error"));
  }, [open, kind, id]);

  const amountInPaise = Math.round((Number(amountRupees) || 0) * 100);
  const feeInPaise = Math.round((Number(feeRupees) || 0) * 100);
  const netInPaise = Math.max(0, amountInPaise - feeInPaise);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const input: CancelRefundInput = {
        method,
        amountInPaise,
        convenienceFeeInPaise: feeInPaise,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (kind === "order") {
        await cancelOrderRefund(id, input);
      } else {
        await cancelSubscriptionRefund(id, input);
      }
      showToast(kind === "order" ? "Order cancelled" : "Subscription cancelled", "success");
      setOpen(false);
      onCancelled();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't process the cancellation.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline btn-sm w-fit cursor-pointer text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
      >
        Cancel &amp; Refund
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/30">
      {kind === "subscription" && (
        <p className="text-xs text-red-700 dark:text-red-400">
          {preview
            ? `${preview.deliveredDays} of ${preview.durationDaysSnapshot} days delivered — ${preview.pendingDays} pending. Suggested refund: ${formatPriceFromPaise(preview.suggestedAmountInPaise)}.`
            : "Loading suggested refund amount…"}
          {preview && !preview.razorpayRefundAvailable && " Razorpay refunds aren't enabled for this business — use Manual."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Refund method</label>
          <Select value={method} onValueChange={(v) => setMethod(v as RefundMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual (recorded only)</SelectItem>
              <SelectItem value="RAZORPAY">Razorpay (real refund)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Refund amount (₹)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Convenience fee (₹)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={feeRupees}
            onChange={(e) => setFeeRupees(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-col justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Net refund: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatPriceFromPaise(netInPaise)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Reason (internal)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="e.g. Customer requested cancellation"
          className="input"
        />
      </div>

      {method === "MANUAL" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Notes — how the refund was actually paid
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Refunded ₹230 via UPI in person"
            className="input w-full resize-none"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || amountInPaise < 0}
          className="btn-primary btn-sm w-fit cursor-pointer"
        >
          {submitting ? "Cancelling…" : "Confirm Cancel & Refund"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost btn-sm w-fit cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
