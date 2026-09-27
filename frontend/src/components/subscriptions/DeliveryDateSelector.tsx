"use client";

import { useMemo, useState } from "react";
import type {
  PlanDateSelection,
  PlanDetail,
  PlanPreviewDay,
} from "@/lib/api/subscriptions";
import {
  autoFillSelection,
  relativeDayNumber,
} from "@/lib/plan-calendar/date-selection";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DeliveryDateDetails } from "./DeliveryDateDetails";
import { DateSelectionIntro } from "./DateSelectionIntro";
import { PlanCalendarDayDetails } from "./PlanCalendarDayDetails";
import { PlanCalendarLegend } from "./PlanCalendarLegend";
import { PlanDayCell } from "./PlanDayCell";
import { PlanPageColumns } from "./PlanPageColumns";
import { PlanMonthGrid } from "./PlanMonthGrid";
import { SelectedDatesList } from "./SelectedDatesList";
import { SelectionStatusBar } from "./SelectionStatusBar";

const RAIL_TAB =
  "flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";

function formatShort(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** The plan's one calendar when the customer picks their own delivery dates.
 * Tapping an available date adds it, the corner ✕ removes one, and Auto-fill
 * tops the plan back up from the end — never re-filling a removed date. */
export function DeliveryDateSelector({
  plan,
  dateSelection,
  selected,
  onChange,
  checkout,
}: {
  plan: PlanDetail;
  dateSelection: PlanDateSelection;
  selected: string[];
  onChange: (dates: string[]) => void;
  checkout: React.ReactNode;
}) {
  const {
    candidates,
    unavailable,
    requiredCount,
    manualSelection,
    mealsByDate,
  } = dateSelection;
  const [editingExceptions, setEditingExceptions] = useState(manualSelection);
  const [focusedDate, setFocusedDate] = useState<string | null>(
    selected[0] ?? null,
  );
  const [railTab, setRailTab] = useState<"day" | "days">("day");
  const [hint, setHint] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const sorted = useMemo(() => [...selected].sort(), [selected]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const candidateSet = useMemo(() => new Set(candidates), [candidates]);
  const unavailableByDate = useMemo(
    () => new Map(unavailable.map((u) => [u.date, u])),
    [unavailable],
  );
  const windowDates = useMemo(
    () => [...candidates, ...unavailable.map((u) => u.date)].sort(),
    [candidates, unavailable],
  );
  const locked = !editingExceptions;

  function dayLabelFor(date: string): string | null {
    if (mealsByDate) return null;
    const n = relativeDayNumber(sorted, date, plan.durationDays);
    return n ? `Day ${n}` : null;
  }

  function mealsFor(date: string): PlanPreviewDay["meals"] | null {
    if (mealsByDate) return mealsByDate[date] ?? [];
    const n = relativeDayNumber(sorted, date, plan.durationDays);
    if (!n) return null;
    const day = plan.days.find((d) => d.dayNumber === n);
    return (day?.slots ?? []).map((s) => ({
      slotType: s.slotType,
      mealId: s.mealId,
      name: s.meal?.name ?? null,
      imageUrl: s.meal?.imageUrl ?? null,
    }));
  }

  function focus(date: string, openSheet = true) {
    setFocusedDate(date);
    setRailTab("day");
    if (isCompact && openSheet) setSheetOpen(true);
  }

  function add(date: string) {
    if (selected.length >= requiredCount) {
      setHint(
        `You've picked all ${requiredCount} days. Remove one (✕) to pick ${formatShort(date)} instead.`,
      );
      return;
    }
    setHint(null);
    onChange([...selected, date].sort());
  }

  function remove(date: string) {
    setHint(null);
    onChange(selected.filter((d) => d !== date));
  }

  // An available date is added straight away (no sheet popping up on every
  // pick on phones); any other date opens its details.
  function tap(date: string) {
    const adding = candidateSet.has(date) && !selectedSet.has(date) && !locked;
    if (adding) add(date);
    focus(date, !adding);
  }

  function renderDetails() {
    if (focusedDate && !candidateSet.has(focusedDate)) {
      const closed = unavailableByDate.get(focusedDate);
      return (
        <PlanCalendarDayDetails
          day={
            closed
              ? {
                  date: closed.date,
                  kind: closed.kind,
                  holiday: closed.holiday,
                  dayLabel: null,
                  meals: [],
                }
              : null
          }
        />
      );
    }
    return (
      <DeliveryDateDetails
        date={focusedDate}
        isSelected={focusedDate ? selectedSet.has(focusedDate) : false}
        dayLabel={focusedDate ? dayLabelFor(focusedDate) : null}
        meals={focusedDate ? mealsFor(focusedDate) : null}
        locked={locked}
        onAdd={add}
        onRemove={remove}
      />
    );
  }

  const yourDays = (
    <SelectedDatesList
      dates={sorted}
      focusedDate={focusedDate}
      locked={locked}
      dayLabelFor={dayLabelFor}
      mealCountFor={(date) => mealsFor(date)?.length ?? 0}
      onFocus={focus}
      onRemove={remove}
    />
  );

  const main = (
    <div className="card flex flex-col gap-5 p-4 sm:p-6">
      <DateSelectionIntro
        requiredCount={requiredCount}
        manualSelection={manualSelection}
        editing={editingExceptions}
        onEditingChange={setEditingExceptions}
      />

      {hint && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {hint}
        </p>
      )}

      <div>
        <PlanMonthGrid
          startDate={windowDates[0]}
          endDate={windowDates.at(-1) ?? windowDates[0]}
          focusedDate={focusedDate}
          renderCell={(cell, otherMonth) => {
            const closed = cell.inMonth
              ? unavailableByDate.get(cell.date)
              : undefined;
            const isCandidate = cell.inMonth && candidateSet.has(cell.date);
            const isSelected = selectedSet.has(cell.date);
            return (
              <PlanDayCell
                date={cell.date}
                kind={
                  closed
                    ? closed.kind
                    : !isCandidate
                      ? "OUTSIDE"
                      : isSelected
                        ? "DELIVERY"
                        : "AVAILABLE"
                }
                highlighted={isSelected}
                focused={cell.date === focusedDate}
                showMonth={otherMonth && cell.inMonth}
                dayLabel={isSelected ? dayLabelFor(cell.date) : null}
                slots={
                  isSelected
                    ? mealsFor(cell.date)?.map((m) => m.slotType)
                    : undefined
                }
                holidayName={closed?.holiday?.name}
                onTap={tap}
                onRemove={isSelected && !locked ? remove : undefined}
              />
            );
          }}
        />
        <PlanCalendarLegend picker />
      </div>

      <SelectionStatusBar
        sortedDates={sorted}
        requiredCount={requiredCount}
        canAutoFill={!locked}
        onAutoFill={() => {
          setHint(null);
          onChange(autoFillSelection(candidates, selected, requiredCount));
        }}
      />

      <div className="lg:hidden">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Your days
        </p>
        {yourDays}
      </div>
    </div>
  );

  return (
    <>
      <PlanPageColumns
        main={main}
        rail={
          <>
            {checkout}
            <aside className="card hidden flex-col gap-4 p-5 lg:flex">
              <div
                role="tablist"
                className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
              >
                {(
                  [
                    { id: "day", label: "Day details" },
                    {
                      id: "days",
                      label: `Your days (${selected.length}/${requiredCount})`,
                    },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={railTab === id}
                    onClick={() => setRailTab(id)}
                    className={`${RAIL_TAB} ${
                      railTab === id
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {railTab === "day" ? renderDetails() : yourDays}
            </aside>
          </>
        }
      />

      <BottomSheet
        open={sheetOpen && isCompact}
        onClose={() => setSheetOpen(false)}
        title="Day details"
      >
        {renderDetails()}
      </BottomSheet>
    </>
  );
}
