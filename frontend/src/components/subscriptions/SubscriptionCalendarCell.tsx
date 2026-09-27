import { AlertTriangle, Check, Lock, SkipForward } from "lucide-react";
import type { SubscriptionCalendarDay } from "@/lib/api/subscriptions";
import {
  dayOfMonth,
  formatLongDate,
  formatMonthShort,
  type GridCell,
} from "@/lib/plan-calendar/month-grid";
import { SLOT_DOT, SLOT_ORDER } from "./plan-calendar-styles";
import {
  HATCH_STYLE,
  STATUS_LABELS,
  STATUS_TONE,
} from "./subscription-calendar-styles";

const BOX =
  "relative flex h-[4.5rem] w-full min-w-0 flex-col justify-between rounded-xl border p-1.5 text-left sm:h-20 sm:p-2";

function mealCountLabel(count: number): string {
  return `${count} ${count === 1 ? "meal" : "meals"}`;
}

/** One date box in the My Subscription calendar — same size and reading
 * order as the plan calendar's PlanDayCell (number, one dot per meal, plan
 * day and meal count), tinted by what happened (or will happen) that day. */
export function SubscriptionCalendarCell({
  cell,
  day,
  focused,
  otherMonth,
  onSelect,
}: {
  cell: GridCell;
  day: SubscriptionCalendarDay | undefined;
  focused: boolean;
  /** A neighbouring month's date sharing this month's row — label its month. */
  otherMonth: boolean;
  onSelect: (date: string) => void;
}) {
  const number = dayOfMonth(cell.date);
  const monthPrefix = otherMonth ? (
    <span className="mb-0.5 block text-[8px] leading-none font-medium tracking-wide uppercase sm:text-[10px]">
      {formatMonthShort(cell.date)}
    </span>
  ) : null;

  // Outside the subscription, or a date a date-selection subscriber never
  // chose: a faded number, so only their own days are boxes.
  if (!cell.inMonth || !day || day.kind === "NOT_SCHEDULED") {
    return (
      <div
        className="flex h-[4.5rem] items-start p-1.5 text-sm text-zinc-300 sm:h-20 sm:p-2 dark:text-zinc-700"
        aria-hidden
      >
        <span className="flex flex-col leading-none">
          {monthPrefix}
          {number}
        </span>
      </div>
    );
  }

  const withMeals =
    day.kind === "DELIVERED" ||
    day.kind === "UPCOMING" ||
    day.kind === "PROJECTED";
  const slots = SLOT_ORDER.flatMap((slot) =>
    day.meals.filter((m) => m.slotType === slot).map(() => slot),
  );
  const ring = focused
    ? "ring-2 ring-primary-600 ring-offset-1 dark:ring-offset-zinc-900"
    : "";

  let status: React.ReactNode = null;
  if (day.kind === "DELIVERED") {
    status = (
      <span className="flex items-center gap-0.5">
        <Check className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Delivered</span>
      </span>
    );
  } else if (day.kind === "SKIPPED") {
    status = (
      <span className="flex items-center gap-0.5">
        <SkipForward className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Skipped</span>
      </span>
    );
  } else if (day.kind === "DISRUPTED") {
    status = (
      <span className="flex items-center gap-0.5">
        <AlertTriangle className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Disrupted</span>
      </span>
    );
  } else if (day.kind === "HOLIDAY") {
    status = (
      <span className="flex min-w-0 flex-col gap-0.5">
        {day.reason && (
          <span className="hidden truncate font-semibold sm:block">
            {day.reason}
          </span>
        )}
        <span className="truncate">Holiday</span>
      </span>
    );
  } else if (day.kind === "OFF_DAY") {
    status = (
      <>
        <span className="sm:hidden">Off</span>
        <span className="hidden sm:inline">No delivery</span>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      aria-pressed={focused}
      aria-label={`${formatLongDate(cell.date)}, ${STATUS_LABELS[day.kind]}${
        day.kind === "HOLIDAY" && day.reason ? `: ${day.reason}` : ""
      }${withMeals && slots.length > 0 ? `, ${mealCountLabel(slots.length)}` : ""}`}
      style={day.kind === "HOLIDAY" ? HATCH_STYLE : undefined}
      className={`${BOX} ${STATUS_TONE[day.kind]} ${ring} cursor-pointer transition-colors`}
    >
      {day.locked && withMeals && day.kind !== "PROJECTED" && (
        <Lock
          className="absolute top-1.5 right-1.5 h-3 w-3 opacity-60"
          aria-hidden
        />
      )}
      <span className="flex flex-col text-sm leading-none font-semibold">
        {monthPrefix}
        {number}
      </span>

      <span className="flex w-full min-w-0 flex-col gap-1 text-[10px] leading-none">
        {withMeals && slots.length > 0 && (
          <span className="flex flex-wrap items-center gap-0.5" aria-hidden>
            {slots.map((slot, i) => (
              <span
                key={`${slot}-${i}`}
                className={`h-1.5 w-1.5 rounded-full ${SLOT_DOT[slot]}`}
              />
            ))}
          </span>
        )}
        {withMeals && (day.dayLabel || slots.length > 0) && (
          <span className="truncate opacity-80">
            {day.dayLabel && (
              <span className="font-semibold">{day.dayLabel}</span>
            )}
            {slots.length > 0 && (
              <span className="hidden sm:inline">
                {day.dayLabel ? " · " : ""}
                {mealCountLabel(slots.length)}
              </span>
            )}
          </span>
        )}
        {day.kind === "DELIVERED" && status}
        {day.kind === "PROJECTED" && (
          <span className="truncate font-semibold text-primary-700 dark:text-primary-400">
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ For holiday</span>
          </span>
        )}
        {!withMeals && status}
      </span>
    </button>
  );
}
