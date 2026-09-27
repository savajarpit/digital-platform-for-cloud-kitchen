"use client";

import { useState } from "react";
import type { PlanDetail } from "@/lib/api/subscriptions";
import { PlanCalendarSection } from "./PlanCalendarSection";
import { PlanDaysPreview } from "./PlanDaysPreview";
import { PlanPageColumns } from "./PlanPageColumns";
import { PlanViewTabs, type PlanViewTab } from "./PlanViewTabs";

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
  const [tab, setTab] = useState<PlanViewTab>("calendar");

  // Anything but a usable calendar falls back to the list — never an empty grid.
  if (viewMode === "ACCORDION" || !calendar || calendar.days.length === 0) {
    return (
      <PlanPageColumns main={<PlanDaysPreview plan={plan} />} rail={checkout} />
    );
  }
  if (viewMode === "CALENDAR") {
    return <PlanCalendarSection calendar={calendar} checkout={checkout} />;
  }

  return (
    <PlanCalendarSection
      calendar={calendar}
      header={<PlanViewTabs tab={tab} onChange={setTab} />}
      listView={tab === "list" ? <PlanDaysPreview plan={plan} /> : undefined}
      checkout={checkout}
    />
  );
}
