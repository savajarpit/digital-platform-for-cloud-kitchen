"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";
import type { SubscriptionCalendarDay } from "@/lib/api/subscriptions";
import { SubscriptionCalendarCell } from "./SubscriptionCalendarCell";
import { PlanMonthGrid } from "./PlanMonthGrid";
import { SLOT_DOT, SLOT_LABELS, SLOT_ORDER } from "./plan-calendar-styles";
import {
  HATCH_STYLE,
  STATUS_LABELS,
  STATUS_TONE,
} from "./subscription-calendar-styles";

const LEGEND_KINDS: SubscriptionCalendarDay["kind"][] = [
  "UPCOMING",
  "DELIVERED",
  "SKIPPED",
  "DISRUPTED",
  "HOLIDAY",
  "OFF_DAY",
];

/** Month-by-month view of a subscription's whole lifetime — past deliveries
 * and skips alongside upcoming and locked days — showing only the weeks from
 * its first day on, like the plan calendar. */
export function SubscriptionCalendar({
  days,
  focusedDate,
  onSelect,
}: {
  days: SubscriptionCalendarDay[];
  focusedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const daysByDate = useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );
  const startDate = days[0]?.date;
  const endDate = days.at(-1)?.date;
  if (!startDate || !endDate) return null;

  return (
    <div className="card p-4 sm:p-6">
      <PlanMonthGrid
        startDate={startDate}
        endDate={endDate}
        focusedDate={focusedDate}
        renderCell={(cell, otherMonth) => (
          <SubscriptionCalendarCell
            cell={cell}
            day={cell.inMonth ? daysByDate.get(cell.date) : undefined}
            focused={cell.date === focusedDate}
            otherMonth={otherMonth && cell.inMonth}
            onSelect={onSelect}
          />
        )}
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {[
          ...LEGEND_KINDS,
          // Only when an upcoming holiday actually adds a day.
          ...(days.some((d) => d.kind === "PROJECTED")
            ? (["PROJECTED"] as const)
            : []),
        ].map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded border ${STATUS_TONE[kind]}`}
              style={kind === "HOLIDAY" ? HATCH_STYLE : undefined}
            />
            {STATUS_LABELS[kind]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden />
          Locked (too close to change)
        </span>
        {SLOT_ORDER.map((slot) => (
          <span key={slot} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SLOT_DOT[slot]}`} />
            {SLOT_LABELS[slot]}
          </span>
        ))}
      </div>
    </div>
  );
}
