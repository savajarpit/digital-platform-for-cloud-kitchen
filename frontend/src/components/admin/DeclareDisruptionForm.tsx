"use client";

import { useState } from "react";
import {
  ApiError,
  declareDisruption,
  type DeclareDisruptionInput,
} from "@/lib/api/admin-subscriptions";
import { useToast } from "@/context/ToastContext";

/** Inline expand/collapse form (no Modal component exists in this codebase)
 * for declaring a real-world disruption — heavy rain, a kitchen emergency —
 * that credits affected subscriber(s) extra days and skips that date's
 * materialization, without touching any already-existing Order. Reused from
 * two entry points: a single subscriber's detail page, and a plan's
 * subscriber list (whole-plan scope). */
export function DeclareDisruptionForm({
  scope,
  subscriptionId,
  planId,
  onDeclared,
  onCancel,
  startOpen = false,
}: {
  scope: "SINGLE" | "PLAN";
  subscriptionId?: string;
  planId?: string;
  onDeclared?: () => void;
  /** Called when Cancel is clicked while startOpen — lets an external
   * toggle (e.g. an icon button on a plan row) collapse in sync. */
  onCancel?: () => void;
  /** Skip the collapsed trigger button and render the form expanded right
   * away — for callers that already have their own external toggle
   * (e.g. an icon button on a plan row) rather than needing this
   * component's own trigger. */
  startOpen?: boolean;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(startOpen);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [compensationDays, setCompensationDays] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!date || !reason.trim()) return;
    setSubmitting(true);
    try {
      const input: DeclareDisruptionInput = {
        date,
        reason: reason.trim(),
        compensationDays: Math.max(1, Math.round(Number(compensationDays) || 1)),
        scope,
        subscriptionId: scope === "SINGLE" ? subscriptionId : undefined,
        planId: scope === "PLAN" ? planId : undefined,
      };
      await declareDisruption(input);
      showToast(
        scope === "PLAN"
          ? "Disruption declared for every active subscriber."
          : "Disruption declared for this subscriber.",
        "success",
      );
      setOpen(false);
      setDate("");
      setReason("");
      setCompensationDays("1");
      onDeclared?.();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't declare disruption.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline btn-sm w-fit cursor-pointer text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
      >
        Declare Disruption
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-xs text-amber-700 dark:text-amber-400">
        {scope === "PLAN"
          ? "Credits every currently-active subscriber of this plan — the affected date won't materialize an order, and nothing already delivered is touched."
          : "Credits this subscriber only — the affected date won't materialize an order, and nothing already delivered is touched."}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Compensation days
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={compensationDays}
            onChange={(e) => setCompensationDays(e.target.value)}
            className="input"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Reason — shown to the customer
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Heavy rain — kitchen unable to prepare or dispatch today."
          className="input w-full resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !date || !reason.trim()}
          className="btn-primary btn-sm w-fit cursor-pointer"
        >
          {submitting ? "Declaring…" : "Declare"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onCancel?.();
          }}
          className="btn-ghost btn-sm w-fit cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
