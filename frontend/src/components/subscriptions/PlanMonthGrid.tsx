"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthPages,
  formatMonthTitle,
  monthOf,
  monthPageIndexOf,
  type GridCell,
} from "@/lib/plan-calendar/month-grid";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NAV_BUTTON =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

/** Month-by-month view of a plan, showing only the weeks that hold plan
 * dates — so a 7-day plan is a row or two per month, never a page of empty
 * boxes. Navigation covers only the months the plan touches. */
export function PlanMonthGrid({
  startDate,
  endDate,
  focusedDate,
  renderCell,
}: {
  startDate: string;
  endDate: string;
  /** The grid follows this date to its month whenever it changes. */
  focusedDate: string | null;
  /** `otherMonth` is true for a plan date that belongs to the neighbouring
   * month but shares a row with this one — label it with its month. */
  renderCell: (cell: GridCell, otherMonth: boolean) => React.ReactNode;
}) {
  const pages = useMemo(
    () => buildMonthPages(startDate, endDate),
    [startDate, endDate],
  );
  const [pageIndex, setPageIndex] = useState(() =>
    monthPageIndexOf(pages, focusedDate),
  );
  // Adjusting state while rendering (not in an effect): jump to the focused
  // date's month when focus moves, e.g. from the "Your days" list.
  const [followedDate, setFollowedDate] = useState(focusedDate);
  if (focusedDate !== followedDate) {
    setFollowedDate(focusedDate);
    setPageIndex(monthPageIndexOf(pages, focusedDate));
  }
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  if (!page) return null;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100">
          {formatMonthTitle(page.month)}
        </h3>
        {pages.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPageIndex((i) => Math.max(i - 1, 0))}
              disabled={pageIndex === 0}
              aria-label="Previous month"
              className={NAV_BUTTON}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setPageIndex((i) => Math.min(i + 1, pages.length - 1))
              }
              disabled={pageIndex >= pages.length - 1}
              aria-label="Next month"
              className={NAV_BUTTON}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase sm:text-xs"
          >
            {label}
          </div>
        ))}
        {page.weeks.flat().map((cell) => (
          <div key={cell.date} className="min-w-0">
            {renderCell(cell, monthOf(cell.date) !== page.month)}
          </div>
        ))}
      </div>
    </div>
  );
}
