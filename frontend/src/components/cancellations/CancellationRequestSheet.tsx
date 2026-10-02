"use client";

import { useId, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SheetActions } from "@/components/ui/SheetActions";
import { ApiError } from "@/lib/api/client";
import {
  CANCELLATION_REASONS,
  type CancellationRequestInput,
} from "@/lib/api/cancellation-requests";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

/**
 * The customer's "please cancel" form: pick a reason, optionally say more.
 * Nothing is cancelled here — the kitchen reviews the request, then
 * approves it with a refund or gets back to the customer.
 */
export function CancellationRequestSheet({
  open,
  onClose,
  title,
  explainer,
  onSubmit,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What happens next — e.g. "deliveries are held from Thu". */
  explainer: string;
  onSubmit: (input: CancellationRequestInput) => Promise<unknown>;
  onSubmitted: () => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const formId = useId();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    setError(null);
    onClose();
  }

  // Validate first, then ask "are you sure?" with the app's usual confirm
  // dialog — it stacks above this sheet — and only send on a yes.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setError(null);
    confirm({
      title: "Send cancellation request?",
      message:
        "The kitchen will review it and get back to you. You can withdraw it while it's pending.",
      confirmLabel: "Yes, send request",
      cancelLabel: "Keep it",
      processingLabel: "Sending…",
      variant: "danger",
      onConfirm: send,
    });
  }

  async function send() {
    setSubmitting(true);
    try {
      await onSubmit({ reason, note: note.trim() || undefined });
      showToast(
        "Cancellation request sent — the kitchen will get back to you.",
        "success",
      );
      setReason("");
      setNote("");
      onSubmitted();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Couldn't send your request. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={close} title={title}>
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{explainer}</p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Why do you want to cancel?
          </legend>
          {CANCELLATION_REASONS.map((r) => (
            <label
              key={r.code}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                reason === r.code
                  ? "border-primary-500 bg-primary-50 text-zinc-900 dark:bg-primary-950/40 dark:text-zinc-100"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={r.code}
                checked={reason === r.code}
                onChange={() => {
                  setReason(r.code);
                  setError(null);
                }}
                className="h-4 w-4 accent-primary-600"
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <div>
          <label
            htmlFor="cancel-note"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Anything else?{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell the kitchen a bit more…"
            className="input w-full resize-none"
          />
        </div>

        {error && (
          <p
            role="alert"
            // The buttons sit in the sheet's fixed footer, so bring the
            // message into view rather than leave it below the fold.
            ref={(el) => el?.scrollIntoView({ block: "nearest" })}
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <SheetActions>
          <button
            type="submit"
            form={formId}
            disabled={submitting}
            className="btn-primary cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? "Sending…" : "Request cancellation"}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="btn-ghost cursor-pointer"
          >
            Keep it
          </button>
        </SheetActions>
      </form>
    </BottomSheet>
  );
}
