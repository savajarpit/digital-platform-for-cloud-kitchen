import { Plus, X } from "lucide-react";
import type { MealSlotType } from "@/lib/api/subscriptions";
import {
  dayOfMonth,
  formatLongDate,
  formatMonthShort,
} from "@/lib/plan-calendar/month-grid";
import { HATCH_STYLE, SLOT_DOT, SLOT_ORDER } from "./plan-calendar-styles";

export type PlanDayCellKind =
  /** Outside the plan span / selection window: a faded number, no box. */
  | "OUTSIDE"
  /** A delivery day (view mode) or a date in the customer's plan (edit mode). */
  | "DELIVERY"
  /** Edit mode: pickable, but not in the plan yet. */
  | "AVAILABLE"
  | "OFF_DAY"
  | "HOLIDAY";

const BOX =
  "flex h-[4.5rem] w-full min-w-0 flex-col justify-between rounded-xl border p-1.5 text-left sm:h-20 sm:p-2";

const TONE: Record<Exclude<PlanDayCellKind, "OUTSIDE">, string> = {
  DELIVERY:
    "border-zinc-200 bg-white hover:border-primary-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary-700",
  AVAILABLE:
    "border-dashed border-zinc-300 bg-white hover:border-primary-400 dark:border-zinc-600 dark:bg-zinc-900",
  OFF_DAY: "border-transparent bg-zinc-100 dark:bg-zinc-800/70",
  HOLIDAY:
    "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60",
};

function mealCountLabel(count: number): string {
  return `${count} ${count === 1 ? "meal" : "meals"}`;
}

function describe(
  kind: PlanDayCellKind,
  mealCount: number,
  holidayName: string | null,
): string {
  if (kind === "HOLIDAY")
    return `holiday${holidayName ? `: ${holidayName}` : ""}`;
  if (kind === "OFF_DAY") return "no delivery";
  if (kind === "AVAILABLE") return "not in your plan";
  return mealCountLabel(mealCount);
}

/** One date box, shared by the browsing calendar and the delivery-date
 * picker so both read the same: one dot per meal (coloured by slot), the
 * plan day, and holidays/off-days with their full wording on wider screens. */
export function PlanDayCell({
  date,
  kind,
  highlighted = false,
  focused,
  showMonth,
  dayLabel = null,
  slots = [],
  holidayName = null,
  onTap,
  onRemove,
}: {
  date: string;
  kind: PlanDayCellKind;
  /** Edit mode: this date is in the customer's plan. */
  highlighted?: boolean;
  focused: boolean;
  /** Prefix the number with its month ("OCT 1") — a neighbouring month's plan date sharing this month's row. */
  showMonth: boolean;
  dayLabel?: string | null;
  /** One entry per meal on the day. */
  slots?: MealSlotType[];
  holidayName?: string | null;
  onTap: (date: string) => void;
  /** Shows the corner ✕ when set. */
  onRemove?: (date: string) => void;
}) {
  const number = dayOfMonth(date);
  // On its own line above the number: inline ("SEP 28") doesn't fit a
  // phone-width box.
  const monthPrefix = showMonth ? (
    <span className="mb-0.5 block text-[8px] leading-none font-medium tracking-wide uppercase sm:text-[10px]">
      {formatMonthShort(date)}
    </span>
  ) : null;

  if (kind === "OUTSIDE") {
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

  const sortedSlots = [...slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b),
  );
  const selectedTone = highlighted
    ? "!border-primary-600 !border-solid !bg-primary-50 dark:!bg-primary-950/40"
    : "";
  const ring = focused
    ? "ring-2 ring-primary-600 ring-offset-1 dark:ring-offset-zinc-900"
    : "";

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onTap(date)}
        aria-pressed={focused}
        aria-label={`${formatLongDate(date)}, ${describe(kind, slots.length, holidayName)}`}
        style={kind === "HOLIDAY" ? HATCH_STYLE : undefined}
        className={`${BOX} ${TONE[kind]} ${selectedTone} ${ring} cursor-pointer transition-colors`}
      >
        <span
          className={`flex flex-col text-sm leading-none font-semibold ${
            kind === "OFF_DAY" || kind === "HOLIDAY"
              ? "text-zinc-500 dark:text-zinc-400"
              : highlighted
                ? "text-primary-800 dark:text-primary-300"
                : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {monthPrefix}
          {number}
        </span>

        <span className="flex w-full min-w-0 flex-col gap-1">
          {kind === "DELIVERY" && (
            <>
              {sortedSlots.length > 0 && (
                <span
                  className="flex flex-wrap items-center gap-0.5"
                  aria-hidden
                >
                  {sortedSlots.map((slot, i) => (
                    <span
                      key={`${slot}-${i}`}
                      className={`h-1.5 w-1.5 rounded-full ${SLOT_DOT[slot]}`}
                    />
                  ))}
                </span>
              )}
              {(dayLabel || sortedSlots.length > 0) && (
                <span className="truncate text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
                  {dayLabel && (
                    <span className="font-semibold text-primary-700 dark:text-primary-400">
                      {dayLabel}
                    </span>
                  )}
                  {sortedSlots.length > 0 && (
                    <span className="hidden sm:inline">
                      {dayLabel ? " · " : ""}
                      {mealCountLabel(sortedSlots.length)}
                    </span>
                  )}
                </span>
              )}
            </>
          )}
          {kind === "AVAILABLE" && (
            <span className="flex items-center gap-0.5 text-[10px] leading-none text-zinc-400">
              <Plus className="h-3 w-3" aria-hidden />
              <span className="hidden sm:inline">Add</span>
            </span>
          )}
          {kind === "OFF_DAY" && (
            <span className="truncate text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
              <span className="sm:hidden">Off</span>
              <span className="hidden sm:inline">No delivery</span>
            </span>
          )}
          {kind === "HOLIDAY" && (
            <span className="flex min-w-0 flex-col gap-0.5">
              {holidayName && (
                <span className="hidden truncate text-[10px] leading-tight font-semibold text-zinc-700 sm:block dark:text-zinc-200">
                  {holidayName}
                </span>
              )}
              <span className="truncate text-[9px] leading-none text-zinc-500 sm:text-[10px] dark:text-zinc-400">
                Holiday
              </span>
            </span>
          )}
        </span>
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(date)}
          aria-label={`Remove ${formatLongDate(date)}`}
          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
