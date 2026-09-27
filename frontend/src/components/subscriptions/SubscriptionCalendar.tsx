"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SubscriptionCalendarDay } from "@/lib/api/subscriptions";
import {
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  monthOf,
} from "@/lib/plan-calendar/month-grid";
import { SubscriptionCalendarCell } from "./SubscriptionCalendarCell";
import { STATUS_LABELS } from "./subscription-calendar-styles";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NAV_BUTTON =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
const LEGEND_KINDS: SubscriptionCalendarDay["kind"][] = [
  "DELIVERED",
  "UPCOMING",
  "SKIPPED",
  "DISRUPTED",
  "HOLIDAY",
];

/** Month grid of a subscription's full lifetime — past deliveries and
 * skips alongside future upcoming/locked days, all in one calendar. */
export function SubscriptionCalendar({
  days,
  focusedDate,
  onSelect,
}: {
  days: SubscriptionCalendarDay[];
  focusedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const firstMonth = monthOf(days[0]?.date ?? focusedDate ?? "");
  const lastMonth = monthOf(days.at(-1)?.date ?? focusedDate ?? "");
  const [month, setMonth] = useState(
    monthOf(focusedDate ?? days[0]?.date ?? ""),
  );

  const daysByDate = useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );
  const weeks = useMemo(() => buildMonthGrid(month), [month]);

  return (
    <div className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-zinc-900 sm:text-xl dark:text-zinc-100">
          {formatMonthTitle(month)}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            disabled={month <= firstMonth}
            aria-label="Previous month"
            className={NAV_BUTTON}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={month >= lastMonth}
            aria-label="Next month"
            className={NAV_BUTTON}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase sm:text-xs"
          >
            {label}
          </div>
        ))}
        {weeks.flat().map((cell) => (
          <SubscriptionCalendarCell
            key={cell.date}
            cell={cell}
            day={daysByDate.get(cell.date)}
            focused={cell.date === focusedDate}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {LEGEND_KINDS.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-zinc-200 dark:border-zinc-700" />
            {STATUS_LABELS[kind]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">Locked (&lt;24h)</span>
      </div>
    </div>
  );
}
