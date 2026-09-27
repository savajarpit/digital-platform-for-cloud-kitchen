"use client";

import { useMemo, useState } from "react";
import type { PlanCalendar as PlanCalendarData } from "@/lib/api/subscriptions";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PlanCalendarDayDetails } from "./PlanCalendarDayDetails";
import { PlanCalendarLegend } from "./PlanCalendarLegend";
import { PlanDayCell } from "./PlanDayCell";
import { PlanPageColumns } from "./PlanPageColumns";
import { PlanMonthGrid } from "./PlanMonthGrid";

/** The browsing calendar: the plan's weeks on the left; checkout and the
 * tapped date's details in the sticky rail on desktop, a bottom sheet on
 * smaller screens. */
export function PlanCalendarSection({
  calendar,
  header,
  listView,
  checkout,
}: {
  calendar: PlanCalendarData;
  /** Rendered above the calendar card, e.g. the Calendar/List tabs. */
  header?: React.ReactNode;
  /** When set, shown instead of the calendar (the "List" tab) — rendered
   * here rather than by the caller so the checkout card never remounts. */
  listView?: React.ReactNode;
  checkout: React.ReactNode;
}) {
  const firstDelivery =
    calendar.days.find((d) => d.kind === "DELIVERY")?.date ??
    calendar.startDate;
  const [focusedDate, setFocusedDate] = useState<string | null>(firstDelivery);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const daysByDate = useMemo(
    () => new Map(calendar.days.map((d) => [d.date, d])),
    [calendar.days],
  );
  const focusedDay = focusedDate ? (daysByDate.get(focusedDate) ?? null) : null;

  function handleTap(date: string) {
    setFocusedDate(date);
    if (isCompact) setSheetOpen(true);
  }

  return (
    <>
      <PlanPageColumns
        main={
          <>
            {header}
            {listView ?? (
              <div className="card p-4 sm:p-6">
                <PlanMonthGrid
                  startDate={calendar.startDate}
                  endDate={calendar.endDate}
                  focusedDate={focusedDate}
                  renderCell={(cell, otherMonth) => {
                    const day = cell.inMonth
                      ? daysByDate.get(cell.date)
                      : undefined;
                    return (
                      <PlanDayCell
                        date={cell.date}
                        kind={day ? day.kind : "OUTSIDE"}
                        focused={cell.date === focusedDate}
                        showMonth={otherMonth && cell.inMonth}
                        dayLabel={day?.dayLabel}
                        slots={day?.meals.map((m) => m.slotType)}
                        holidayName={day?.holiday?.name}
                        onTap={handleTap}
                      />
                    );
                  }}
                />
                <PlanCalendarLegend />
              </div>
            )}
          </>
        }
        rail={
          <>
            {checkout}
            <aside className={`card hidden p-5 ${listView ? "" : "lg:block"}`}>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Day details
              </p>
              <PlanCalendarDayDetails day={focusedDay} />
            </aside>
          </>
        }
      />

      <BottomSheet
        open={sheetOpen && isCompact}
        onClose={() => setSheetOpen(false)}
        title="Day details"
      >
        <PlanCalendarDayDetails day={focusedDay} />
      </BottomSheet>
    </>
  );
}
