import type { PlanPreviewDay } from "@/lib/api/subscriptions";
import { SLOT_DOT, SLOT_LABELS, SLOT_ORDER } from "./plan-calendar-styles";
import { MealThumb } from "@/components/ui/MealThumb";

/** A day's meals in slot order, with photo and a "to be announced" fallback. */
export function PlanMealList({ meals }: { meals: PlanPreviewDay["meals"] }) {
  const sorted = [...meals].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slotType) - SLOT_ORDER.indexOf(b.slotType),
  );

  return (
    // Desktop rail only (the bottom sheet below lg scrolls as a whole): the
    // meal list scrolls by itself so a 3-meal day doesn't push the add/remove
    // action and the rest of the rail off screen.
    <ul className="flex flex-col gap-2.5 lg:max-h-48 lg:overflow-y-auto lg:[scrollbar-width:thin]">
      {sorted.map((meal) => (
        <li
          key={meal.slotType}
          className="flex items-center gap-3 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/60"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <MealThumb src={meal.imageUrl} alt={meal.name ?? ""} />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              <span
                className={`h-1.5 w-1.5 rounded-full ${SLOT_DOT[meal.slotType]}`}
              />
              {SLOT_LABELS[meal.slotType]}
            </p>
            <p
              className={
                meal.name
                  ? "truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                  : "text-sm text-zinc-400 italic dark:text-zinc-500"
              }
            >
              {meal.name ?? "Meal to be announced"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
