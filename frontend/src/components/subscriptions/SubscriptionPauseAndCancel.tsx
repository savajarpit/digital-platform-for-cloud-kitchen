import type { SubscriptionDetail } from "@/lib/api/subscriptions";

/** The pause-a-range form and (if entitled) the self-cancel card — the
 * two whole-subscription actions on the My Subscription page. */
export function SubscriptionPauseAndCancel({
  subscription,
  pauseFrom,
  pauseTo,
  busy,
  onPauseFromChange,
  onPauseToChange,
  onPause,
  onCancel,
}: {
  subscription: SubscriptionDetail;
  pauseFrom: string;
  pauseTo: string;
  busy: boolean;
  onPauseFromChange: (value: string) => void;
  onPauseToChange: (value: string) => void;
  onPause: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
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
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              From
            </label>
            <input
              type="date"
              value={pauseFrom}
              onChange={(e) => onPauseFromChange(e.target.value)}
              min={subscription.earliestEditableDate}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              To
            </label>
            <input
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

      {subscription.canCancel && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Cancel
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Stops all future deliveries for this subscription immediately.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline btn-sm self-start text-red-600"
          >
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  );
}
