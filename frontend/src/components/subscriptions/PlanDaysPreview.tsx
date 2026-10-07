import type { PlanDetail, PlanPreviewDay } from "@/lib/api/subscriptions";
import { MealThumb } from "@/components/ui/MealThumb";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** The day-by-day meal preview on a plan's detail page (weekly-fixed plans
 * show the upcoming calendar window, relative-day plans show "Day N"). */
interface WeeklyRow {
  date: string;
  meals: PlanPreviewDay["meals"];
  /** Null = an ordinary delivery day with no badge. */
  badge: string | null;
}

/** When the tenant uses the calendar view, the list is drawn from the same
 * calendar data (so both tabs always agree on dates, holidays and start day);
 * otherwise from the original rolling preview window. */
function toWeeklyRows(plan: PlanDetail): WeeklyRow[] {
  if (plan.calendar) {
    return plan.calendar.days.map((d) => ({
      date: d.date,
      meals: d.meals,
      badge:
        d.kind === "HOLIDAY"
          ? d.holiday?.name
            ? `Holiday · ${d.holiday.name}`
            : "Holiday"
          : d.kind === "OFF_DAY"
            ? "No delivery"
            : null,
    }));
  }
  return (plan.previewWindow ?? []).map((d) => ({
    date: d.date,
    meals: d.meals,
    badge: d.meals.length === 0 ? "Holiday" : null,
  }));
}

export function PlanDaysPreview({ plan }: { plan: PlanDetail }) {
  return (
    <div className="flex flex-col gap-3">
      {plan.schedulingMode === "WEEKLY_FIXED"
        ? toWeeklyRows(plan).map((day) => (
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
                  {new Date(day.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </h3>
                {day.badge && (
                  <span className="badge bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    {day.badge}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {day.meals.length === 0 ? (
                  // Zero slots for this real weekday (not zero meals within a
                  // decided slot — that case renders per-slot below with
                  // "Meal to be announced" instead) means no delivery happens
                  // this day at all, so this is never "still being decided."
                  <p className="text-xs text-zinc-400 italic">
                    No deliveries on this day.
                  </p>
                ) : (
                  day.meals.map((meal, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <MealThumb src={meal.imageUrl} alt={meal.name ?? ""} />
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
        : plan.days.map((day) => (
            <div key={day.id} className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Day {day.dayNumber}
              </h3>
              <div className="mt-3 flex flex-col gap-3">
                {day.slots.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">
                    Meals for this day to be decided.
                  </p>
                ) : (
                  day.slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <MealThumb src={slot.meal?.imageUrl} alt={slot.meal?.name ?? ""} />
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
          ))}
    </div>
  );
}
