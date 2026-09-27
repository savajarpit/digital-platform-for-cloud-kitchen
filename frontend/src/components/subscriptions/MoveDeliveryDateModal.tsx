"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ApiError, getMoveCandidates } from "@/lib/api/subscriptions";
import { formatLongDate } from "@/lib/plan-calendar/month-grid";
import { useToast } from "@/context/ToastContext";

/** Confirm dialog for relocating one scheduled delivery — fetches the valid
 * alternate dates (same window the checkout picker used) and lets the
 * customer pick one before the parent actually performs the move. */
export function MoveDeliveryDateModal({
  subscriptionId,
  date,
  moving,
  onClose,
  onConfirm,
}: {
  subscriptionId: string;
  date: string;
  moving: boolean;
  onClose: () => void;
  onConfirm: (newDate: string) => void;
}) {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMoveCandidates(subscriptionId, date)
      .then((dates) => {
        if (!cancelled) setCandidates(dates);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(true);
        showToast(
          err instanceof ApiError
            ? err.message
            : "Couldn't load available dates.",
          "error",
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId, date]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-soft dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
              Move {formatLongDate(date)}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Choose a new date. You still get the same number of deliveries
              — this one just happens on the new day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadError ? (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Couldn&apos;t load available dates.
          </p>
        ) : !candidates ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No other dates are available to move this delivery to right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {candidates.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelected(c)}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  selected === c
                    ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {formatLongDate(c)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline btn-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || moving}
            className="btn-primary btn-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {moving ? "Moving…" : "Move delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
