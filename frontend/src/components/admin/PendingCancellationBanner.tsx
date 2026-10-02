"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  type CancellationKind,
  getPendingCancellationFor,
} from "@/lib/api/cancellation-requests";
import { qk } from "@/lib/query/keys";
import { RejectCancellationSheet } from "./RejectCancellationSheet";

export const CANCEL_REFUND_ANCHOR = "cancel-refund";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Top-of-page alert on an admin subscription/order detail when the customer
 * has asked to cancel. Approve = the existing Cancel & Refund form below
 * (which also closes the request); Reject = a note back to the customer.
 */
export function PendingCancellationBanner({
  kind,
  targetId,
  canDecide,
  onChanged,
}: {
  kind: CancellationKind;
  targetId: string;
  /** Holds the *.cancel-refund permission — can approve or reject. */
  canDecide: boolean;
  onChanged: () => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const { data: request } = useQuery({
    queryKey: qk.admin("cancellation-requests", "pending", kind, targetId),
    queryFn: () => getPendingCancellationFor(kind, targetId),
    staleTime: 0,
  });

  if (!request) return null;

  const customer = [request.user.firstName, request.user.lastName]
    .filter(Boolean)
    .join(" ");
  // Opens the Cancel & Refund form below (if still collapsed) and brings it
  // into view — submitting it is what approves the request.
  const approve = () => {
    const anchor = document.getElementById(CANCEL_REFUND_ANCHOR);
    anchor
      ?.querySelector<HTMLButtonElement>("[data-cancel-refund-open]")
      ?.click();
    requestAnimationFrame(() =>
      anchor?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">
            {customer} asked to cancel on{" "}
            {new Date(request.createdAt).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-0.5">
            <span className="font-medium">Reason:</span> {request.reasonLabel}
          </p>
          {request.note && (
            <p className="mt-0.5 wrap-break-word">
              &ldquo;{request.note}&rdquo;
            </p>
          )}
          {request.heldFromDate && (
            <p className="mt-1 text-xs">
              Deliveries are on hold from {formatDay(request.heldFromDate)}{" "}
              until you decide.
            </p>
          )}
        </div>
      </div>
      {canDecide ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={approve}
            className="btn-primary btn-sm cursor-pointer whitespace-nowrap"
          >
            Approve &amp; refund
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            className="btn-outline btn-sm cursor-pointer whitespace-nowrap"
          >
            Reject
          </button>
        </div>
      ) : (
        <p className="text-xs">
          Someone with cancel &amp; refund access needs to approve or reject
          this.
        </p>
      )}
      <RejectCancellationSheet
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        kind={kind}
        requestId={request.id}
        onRejected={() => {
          setRejectOpen(false);
          onChanged();
        }}
      />
    </section>
  );
}
