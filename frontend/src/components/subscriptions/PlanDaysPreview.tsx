import { ImageOff } from "lucide-react";
import type { PlanDetail } from "@/lib/api/subscriptions";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** The day-by-day meal preview on a plan's detail page (weekly-fixed plans
 * show the upcoming calendar window, relative-day plans show "Day N"). */
export function PlanDaysPreview({ plan }: { plan: PlanDetail }) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      {plan.schedulingMode === "WEEKLY_FIXED" ? (
        (plan.previewWindow ?? []).map((day) => (
          <div
            key={day.date}
            className={`card p-4 ${
              day.meals.length === 0
                ? "border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {new Date(day.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              {day.meals.length === 0 && (
                <span className="badge bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  Holiday
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {day.meals.length === 0 ? (
                // Zero slots for this real weekday (not zero meals within a
                // decided slot — that case renders per-slot below with
                // "Meal to be announced" instead) means no delivery happens
                // this day at all, so this is never "still being decided."
                <p className="text-xs text-zinc-400 italic">No deliveries on this day.</p>
              ) : (
                day.meals.map((meal, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {meal.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meal.imageUrl}
                          alt={meal.name ?? ""}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">
                        {SLOT_LABELS[meal.slotType] ?? meal.slotType}
                      </p>
                      <p
                        className={
                          meal.name
                            ? "truncate pr-1 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                            : "truncate pr-1 text-sm text-zinc-400 italic dark:text-zinc-500"
                        }
                      >
                        {meal.name ?? "Meal to be announced"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      ) : (
        plan.days.map((day) => (
          <div key={day.id} className="card p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Day {day.dayNumber}
            </h3>
            <div className="mt-3 flex flex-col gap-3">
              {day.slots.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Meals for this day to be decided.</p>
              ) : (
                day.slots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {slot.meal?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot.meal.imageUrl}
                          alt={slot.meal.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">
                        {SLOT_LABELS[slot.slotType] ?? slot.slotType}
                      </p>
                      <p
                        className={
                          slot.meal
                            ? "truncate pr-1 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                            : "truncate pr-1 text-sm text-zinc-400 italic dark:text-zinc-500"
                        }
                      >
                        {slot.meal?.name ?? "Meal to be announced"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
