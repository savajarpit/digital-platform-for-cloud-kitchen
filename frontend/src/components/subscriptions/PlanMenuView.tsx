"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import type { PlanDetail } from "@/lib/api/subscriptions";
import { PlanCalendarSection } from "./PlanCalendarSection";
import { PlanDaysPreview } from "./PlanDaysPreview";
import { PlanPageColumns } from "./PlanPageColumns";

const TAB_BASE =
  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors";

/** A plan's day-by-day menu in whichever layout the tenant chose — the
 * accordion list (default), a month calendar, or both behind tabs — laid out
 * beside the checkout rail. */
export function PlanMenuView({
  plan,
  checkout,
}: {
  plan: PlanDetail;
  checkout: React.ReactNode;
}) {
  const { viewMode, calendar } = plan;
  const [tab, setTab] = useState<"calendar" | "list">("calendar");

  // Anything but a usable calendar falls back to the list — never an empty grid.
  if (viewMode === "ACCORDION" || !calendar || calendar.days.length === 0) {
    return (
      <PlanPageColumns main={<PlanDaysPreview plan={plan} />} rail={checkout} />
    );
  }
  if (viewMode === "CALENDAR") {
    return <PlanCalendarSection calendar={calendar} checkout={checkout} />;
  }

  const tabs = (
    <div
      role="tablist"
      aria-label="Menu view"
      className="mb-4 inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
    >
      {(
        [
          { id: "calendar", label: "Calendar", Icon: CalendarDays },
          { id: "list", label: "List", Icon: List },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={`${TAB_BASE} ${
            tab === id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <PlanCalendarSection
      calendar={calendar}
      header={tabs}
      listView={tab === "list" ? <PlanDaysPreview plan={plan} /> : undefined}
      checkout={checkout}
    />
  );
}
