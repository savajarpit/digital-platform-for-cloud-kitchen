import { AlertTriangle, Check, Lock, SkipForward } from "lucide-react";
import type { SubscriptionCalendarDay } from "@/lib/api/subscriptions";
import {
  dayOfMonth,
  formatLongDate,
  type GridCell,
} from "@/lib/plan-calendar/month-grid";
import { HATCH_STYLE, STATUS_TONE } from "./subscription-calendar-styles";

const BASE =
  "flex min-h-14 min-w-0 flex-col justify-between rounded-xl border p-1.5 text-left sm:min-h-16 sm:p-2";

const KIND_ICON: Partial<
  Record<SubscriptionCalendarDay["kind"], typeof Check>
> = {
  DELIVERED: Check,
  SKIPPED: SkipForward,
  DISRUPTED: AlertTriangle,
};

/** One date box in the My Subscription month grid. */
export function SubscriptionCalendarCell({
  cell,
  day,
  focused,
  onSelect,
}: {
  cell: GridCell;
  day: SubscriptionCalendarDay | undefined;
  focused: boolean;
  onSelect: (date: string) => void;
}) {
  const number = dayOfMonth(cell.date);

  if (!cell.inMonth) {
    return (
      <div
        className="p-1.5 text-xs text-zinc-300 dark:text-zinc-700"
        aria-hidden
      >
        {number}
      </div>
    );
  }
  if (!day) {
    return (
      <div
        className={`${BASE} border-transparent bg-zinc-50/70 text-zinc-300 dark:bg-zinc-800/30 dark:text-zinc-600`}
        aria-hidden
      >
        <span className="text-sm font-medium">{number}</span>
      </div>
    );
  }

  const Icon = KIND_ICON[day.kind];
  const ring = focused ? "ring-2 ring-primary-600" : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      aria-pressed={focused}
      aria-label={`${formatLongDate(cell.date)}, ${day.kind.toLowerCase().replace("_", " ")}`}
      style={day.kind === "HOLIDAY" ? HATCH_STYLE : undefined}
      className={`${BASE} ${STATUS_TONE[day.kind]} ${ring} cursor-pointer transition-colors`}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold">{number}</span>
        {day.locked && <Lock className="h-3 w-3 opacity-70" aria-hidden />}
      </span>
      <span className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" aria-hidden />}
        {day.dayLabel && (
          <span className="truncate text-[10px] font-medium">
            {day.dayLabel}
          </span>
        )}
      </span>
    </button>
  );
}
