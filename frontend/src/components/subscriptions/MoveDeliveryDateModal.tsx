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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !moving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moving, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* Header and buttons stay put; only the date list scrolls. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-delivery-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <h3
              id="move-delivery-title"
              className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100"
            >
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

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
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
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
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
