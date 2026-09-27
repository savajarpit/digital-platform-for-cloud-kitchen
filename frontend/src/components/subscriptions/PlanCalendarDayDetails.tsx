import { CalendarOff, Check, FileText, Minus } from "lucide-react";
import type { PlanCalendarDay } from "@/lib/api/subscriptions";
import { formatLongDate, formatWeekday } from "@/lib/plan-calendar/month-grid";
import { HATCH_STYLE } from "./plan-calendar-styles";
import { PlanMealList } from "./PlanMealList";

const NEUTRAL_CHIP =
  "badge bg-zinc-100 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

function StatusChip({ day }: { day: PlanCalendarDay }) {
  if (day.kind === "HOLIDAY")
    return <span className={NEUTRAL_CHIP}>Holiday</span>;
  if (day.kind === "OFF_DAY") {
    return (
      <span className={NEUTRAL_CHIP}>
        <Minus className="h-3 w-3" />
        No delivery
      </span>
    );
  }
  return (
    <span className="badge bg-primary-50 text-[11px] text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
      <Check className="h-3 w-3" />
      {day.dayLabel ?? "Delivery day"}
    </span>
  );
}

/** What a selected calendar date holds: its meals, or why nothing is delivered. */
export function PlanCalendarDayDetails({
  day,
}: {
  day: PlanCalendarDay | null;
}) {
  if (!day) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Pick a date to see what&apos;s on the menu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {formatLongDate(day.date)}
        </h3>
        <StatusChip day={day} />
      </div>

      {day.kind === "HOLIDAY" && (
        <div
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
          style={HATCH_STYLE}
        >
          <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Kitchen closed
          </p>
          <p className="font-display mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {day.holiday?.name ?? "Closed for the day"}
          </p>
          {day.holiday?.note && (
            <p className="mt-2 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              {day.holiday.note}
            </p>
          )}
        </div>
      )}

      {day.kind === "OFF_DAY" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
          <CalendarOff className="h-6 w-6 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No deliveries on this day
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This plan doesn&apos;t deliver on {formatWeekday(day.date)}s. Pick
            another date to see the menu.
          </p>
        </div>
      )}

      {day.kind === "DELIVERY" && <PlanMealList meals={day.meals} />}
    </div>
  );
}
