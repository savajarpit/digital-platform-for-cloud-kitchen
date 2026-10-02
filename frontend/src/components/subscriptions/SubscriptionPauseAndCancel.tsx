"use client";

import { useState } from "react";
import type { SubscriptionDetail } from "@/lib/api/subscriptions";
import { requestSubscriptionCancellation } from "@/lib/api/cancellation-requests";
import { CancellationRequestSheet } from "@/components/cancellations/CancellationRequestSheet";

/** The pause-a-range form and the "request cancellation" card — the two
 * whole-subscription actions on the My Subscription page. Cancelling is a
 * request the kitchen reviews (and refunds), never an instant cancel. */
export function SubscriptionPauseAndCancel({
  subscription,
  pauseFrom,
  pauseTo,
  busy,
  onPauseFromChange,
  onPauseToChange,
  onPause,
  onCancellationChanged,
}: {
  subscription: SubscriptionDetail;
  pauseFrom: string;
  pauseTo: string;
  busy: boolean;
  onPauseFromChange: (value: string) => void;
  onPauseToChange: (value: string) => void;
  onPause: (e: React.FormEvent) => void;
  onCancellationChanged: () => void;
}) {
  const [requestOpen, setRequestOpen] = useState(false);
  // earliestEditableDate is a tenant-local YYYY-MM-DD: format it in UTC so
  // it never shifts a day in the viewer's own timezone.
  const holdFrom = new Date(`${subscription.earliestEditableDate}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const cardCopy = `Send a cancellation request to the kitchen. Deliveries go on hold from ${holdFrom} while they review it, and they'll refund your undelivered days if they approve.`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form onSubmit={onPause} className="card flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Pause a range (e.g. a vacation)
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Paused days are banked — your plan simply runs that many days longer
          once resumed. Changes need at least a day&apos;s notice, so the
          earliest start is{" "}
          {new Date(subscription.earliestEditableDate).toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
            },
          )}
          .
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pause-from"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              From
            </label>
            <input
              id="pause-from"
              type="date"
              value={pauseFrom}
              onChange={(e) => onPauseFromChange(e.target.value)}
              min={subscription.earliestEditableDate}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pause-to"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              To
            </label>
            <input
              id="pause-to"
              type="date"
              value={pauseTo}
              onChange={(e) => onPauseToChange(e.target.value)}
              min={pauseFrom || subscription.earliestEditableDate}
              className="input"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || !pauseFrom || !pauseTo}
          className="btn-primary btn-sm self-start"
        >
          Pause
        </button>
      </form>

      {subscription.canRequestCancellation && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Cancel subscription
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {cardCopy}
          </p>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="btn-outline btn-sm cursor-pointer self-start text-red-600"
          >
            Request cancellation
          </button>
        </div>
      )}

      <CancellationRequestSheet
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request cancellation"
        explainer={`Deliveries go on hold from ${holdFrom} while the kitchen reviews your request. If they approve, they'll refund your undelivered days; if not, your held days are added to the end of your plan.`}
        onSubmit={(input) => requestSubscriptionCancellation(subscription.id, input)}
        onSubmitted={() => {
          setRequestOpen(false);
          onCancellationChanged();
        }}
      />
    </div>
  );
}
