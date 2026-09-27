import { Check, Minus, Plus } from "lucide-react";
import type { PlanPreviewDay } from "@/lib/api/subscriptions";
import { formatLongDate } from "@/lib/plan-calendar/month-grid";
import { PlanMealList } from "./PlanMealList";

/** The focused date in the delivery-date picker: whether it's in the plan,
 * its menu, and the add/remove action for it. */
export function DeliveryDateDetails({
  date,
  isSelected,
  dayLabel,
  meals,
  locked,
  onAdd,
  onRemove,
}: {
  date: string | null;
  isSelected: boolean;
  dayLabel: string | null;
  /** Null when the menu depends on the final selection (a RELATIVE_DAY date
   * that isn't picked yet). */
  meals: PlanPreviewDay["meals"] | null;
  /** Long-plan default: everything pre-selected, editing switched off. */
  locked: boolean;
  onAdd: (date: string) => void;
  onRemove: (date: string) => void;
}) {
  if (!date) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Tap a date to see its menu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {formatLongDate(date)}
        </h3>
        {isSelected ? (
          <span className="badge w-fit bg-primary-50 text-[11px] text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
            <Check className="h-3 w-3" />
            In your plan{dayLabel ? ` · ${dayLabel}` : ""}
          </span>
        ) : (
          <span className="badge w-fit bg-zinc-100 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Not in your plan
          </span>
        )}
      </div>

      {meals && meals.length > 0 ? (
        <PlanMealList meals={meals} />
      ) : (
        <p className="rounded-xl bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          {isSelected
            ? "Menu to be announced."
            : "Add this date to see which plan day it becomes."}
        </p>
      )}

      {locked ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Turn on &ldquo;Change specific dates&rdquo; to adjust this day.
        </p>
      ) : isSelected ? (
        <button
          type="button"
          onClick={() => onRemove(date)}
          className="btn-outline w-full cursor-pointer justify-center"
        >
          <Minus className="h-4 w-4" />
          Remove this date
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(date)}
          className="btn-primary w-full cursor-pointer justify-center"
        >
          <Plus className="h-4 w-4" />
          Add this date
        </button>
      )}
    </div>
  );
}
