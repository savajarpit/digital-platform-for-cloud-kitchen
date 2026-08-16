import { ImageOff } from "lucide-react";
import type { MealSlotType, PlanDay } from "@/lib/api/admin-subscriptions";

const SLOT_LABELS: Record<MealSlotType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export function PlanDayBreakdown({ days }: { days: PlanDay[] }) {
  if (days.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No days configured yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {days.map((day) => (
        <div key={day.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
          <p className="mb-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">Day {day.dayNumber}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {day.slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  {slot.meal?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.meal.imageUrl} alt={slot.meal.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <ImageOff className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                    {SLOT_LABELS[slot.slotType]}
                  </p>
                  <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                    {slot.meal?.name ?? "To be announced"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
