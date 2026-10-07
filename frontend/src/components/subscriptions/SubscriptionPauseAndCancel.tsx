"use client";

import { useState } from "react";
import type { SubscriptionDetail } from "@/lib/api/subscriptions";
import { requestSubscriptionCancellation } from "@/lib/api/cancellation-requests";
import { CancellationRequestSheet } from "@/components/cancellations/CancellationRequestSheet";
import { addDaysToDateStr, formatDateStrShort } from "@/lib/format/date";

/** Mirrors the backend's MAX_PAUSE_DAYS (subscription-day-rules.ts). */
const MAX_PAUSE_DAYS = 30;

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
  const holdPending = subscription.cancellationRequest?.status === "PENDING";
  // earliestEditableDate is a tenant-local YYYY-MM-DD: format it in UTC so
  // it never shifts a day in the viewer's own timezone.
  const holdFrom = new Date(`${subscription.earliestEditableDate}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  // A pause must start inside the plan (and after the notice window); the
  // calendar spans exactly the plan's days.
  const planFirstDay = subscription.calendar[0]?.date;
  const planLastDay = subscription.calendar.at(-1)?.date;
  const earliestStart =
    planFirstDay && planFirstDay > subscription.earliestEditableDate
      ? planFirstDay
      : subscription.earliestEditableDate;
  const cardCopy = `Send a cancellation request to the kitchen. Deliveries go on hold from ${holdFrom} while they review it, and they'll refund your undelivered days if they approve.`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* While a cancellation request is pending every remaining day is on
          hold, so there is nothing left to pause. */}
      {!holdPending && (
      <form onSubmit={onPause} className="card flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Pause a range (e.g. a vacation)
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The deliveries you miss are added after the pause ends, so you still
          get every one. A pause can start from{" "}
          {formatDateStrShort(earliestStart)}
          {planLastDay && <> up to {formatDateStrShort(planLastDay)}</>} and
          last up to {MAX_PAUSE_DAYS} days.
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
              min={earliestStart}
              max={planLastDay}
              className="input cursor-pointer"
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
              min={pauseFrom || earliestStart}
              max={pauseFrom ? addDaysToDateStr(pauseFrom, MAX_PAUSE_DAYS - 1) : undefined}
              className="input cursor-pointer"
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
      )}

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
