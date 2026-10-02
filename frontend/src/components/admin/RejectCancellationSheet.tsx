"use client";

import { useId, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SheetActions } from "@/components/ui/SheetActions";
import { ApiError } from "@/lib/api/client";
import {
  type CancellationKind,
  rejectCancellationRequest,
} from "@/lib/api/cancellation-requests";
import { useToast } from "@/context/ToastContext";

/** Declines a customer's cancellation request with a note they'll receive
 * by email. For a subscription, held days are banked back automatically. */
export function RejectCancellationSheet({
  open,
  onClose,
  kind,
  requestId,
  onRejected,
}: {
  open: boolean;
  onClose: () => void;
  kind: CancellationKind;
  requestId: string;
  onRejected: () => void;
}) {
  const { showToast } = useToast();
  const formId = useId();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = note.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed.length < 3) {
      setError("Add a short note for the customer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rejectCancellationRequest(kind, requestId, trimmed);
      showToast("Request rejected — the customer has been emailed.", "success");
      setNote("");
      onRejected();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't reject the request.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => !saving && onClose()}
      title="Reject cancellation request"
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {kind === "SUBSCRIPTION"
            ? "Deliveries resume from the next day, and every held day is added to the end of the plan."
            : "The order goes ahead as planned."}{" "}
          The customer gets your note by email.
        </p>
        <div>
          <label
            htmlFor="reject-note"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Note for the customer
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. We've paused your plan for two weeks instead — call us anytime."
            className="input w-full resize-none"
          />
        </div>
        {error && (
          <p
            role="alert"
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
            disabled={saving}
            className="btn-primary cursor-pointer bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed"
          >
            {saving ? "Rejecting…" : "Reject request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost cursor-pointer"
          >
            Back
          </button>
        </SheetActions>
      </form>
    </BottomSheet>
  );
}
