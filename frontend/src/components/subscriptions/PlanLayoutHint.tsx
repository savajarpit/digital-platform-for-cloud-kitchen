"use client";

import { createContext, useContext } from "react";

const PlanLayoutHintContext = createContext(false);

/** Tells a plan page's loading skeletons — before any client fetch has
 * finished — whether the page will show a calendar. Resolved on the server
 * from the tenant's public subscription settings. */
export function PlanLayoutHintProvider({
  usesCalendar,
  children,
}: {
  usesCalendar: boolean;
  children: React.ReactNode;
}) {
  return (
    <PlanLayoutHintContext.Provider value={usesCalendar}>
      {children}
    </PlanLayoutHintContext.Provider>
  );
}

export function usePlanLayoutHint(): boolean {
  return useContext(PlanLayoutHintContext);
}
