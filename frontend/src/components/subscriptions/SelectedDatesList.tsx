import { X } from "lucide-react";
import { formatLongDate } from "@/lib/plan-calendar/month-grid";

function formatRowDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Every picked delivery date in order, with its plan day and meal count —
 * tapping a row shows that day's menu; ✕ removes it. */
export function SelectedDatesList({
  dates,
  focusedDate,
  locked,
  dayLabelFor,
  mealCountFor,
  onFocus,
  onRemove,
}: {
  dates: string[];
  focusedDate: string | null;
  locked: boolean;
  dayLabelFor: (date: string) => string | null;
  mealCountFor: (date: string) => number;
  onFocus: (date: string) => void;
  onRemove: (date: string) => void;
}) {
  if (dates.length === 0) {
    return (
      <p className="rounded-xl bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
        No dates picked yet.
      </p>
    );
  }

  return (
    // A border (not a ring) marks the focused row: a ring draws outside the
    // box and would be clipped by the scroll container at its edges.
    <ul className="flex flex-col gap-1.5 lg:max-h-72 lg:overflow-y-auto">
      {dates.map((date) => {
        const dayLabel = dayLabelFor(date);
        const mealCount = mealCountFor(date);
        return (
          <li
            key={date}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              date === focusedDate
                ? "border-primary-600 bg-primary-50 dark:bg-primary-950/40"
                : "border-transparent bg-zinc-50 dark:bg-zinc-800/60"
            }`}
          >
            <button
              type="button"
              onClick={() => onFocus(date)}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
            >
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {formatRowDate(date)}
              </span>
              <span className="truncate text-zinc-500 dark:text-zinc-400">
                {[
                  dayLabel,
                  mealCount > 0
                    ? `${mealCount} ${mealCount === 1 ? "meal" : "meals"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
            {!locked && (
              <button
                type="button"
                onClick={() => onRemove(date)}
                aria-label={`Remove ${formatLongDate(date)}`}
                className="cursor-pointer text-zinc-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
