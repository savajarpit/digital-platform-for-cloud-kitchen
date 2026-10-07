"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  KitchenFulfillmentType,
  KitchenQuery,
  KitchenStage,
} from "@/lib/api/kitchen";

export type KitchenTab = "prep" | "orders" | "plans";
/** "ACTIVE" = New + Preparing + Ready (the default board). */
export type KitchenStageFilter = KitchenStage | "ACTIVE";

export interface KitchenFilterState {
  tab: KitchenTab;
  date: string;
  slot: string;
  type: KitchenFulfillmentType | "";
  stage: KitchenStageFilter;
  hasNotes: boolean;
  hasAddons: boolean;
  planId: string;
  changedOnly: boolean;
  q: string;
  sort: "time" | "placed";
  category: string;
}

const TABS: KitchenTab[] = ["prep", "orders", "plans"];
const STAGES: KitchenStageFilter[] = [
  "ACTIVE",
  "NEW",
  "PREPARING",
  "READY",
  "DONE",
];

/** Every filter lives in the URL, so a refresh or a shared link opens the
 * same view — the way kitchen screens get bookmarked per station. */
export function useKitchenFilters(today: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const state: KitchenFilterState = useMemo(() => {
    const tab = params.get("tab") as KitchenTab;
    const stage = params.get("stage") as KitchenStageFilter;
    return {
      tab: TABS.includes(tab) ? tab : "orders",
      date: params.get("date") ?? today ?? "",
      slot: params.get("slot") ?? "",
      type: (params.get("type") ?? "") as KitchenFilterState["type"],
      stage: STAGES.includes(stage) ? stage : "ACTIVE",
      hasNotes: params.get("hasNotes") === "true",
      hasAddons: params.get("hasAddons") === "true",
      planId: params.get("planId") ?? "",
      changedOnly: params.get("changedOnly") === "true",
      q: params.get("q") ?? "",
      sort: params.get("sort") === "placed" ? "placed" : "time",
      category: params.get("category") ?? "",
    };
  }, [params, today]);

  const update = useCallback(
    (patch: Partial<KitchenFilterState>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        const isDefault =
          value === "" ||
          value === false ||
          (key === "date" && value === today) ||
          (key === "stage" && value === "ACTIVE") ||
          (key === "sort" && value === "time") ||
          (key === "tab" && value === "orders");
        if (isDefault) next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, today],
  );

  return { state, update };
}

/** The API query for the current view (the stage is left to the board). */
export function toKitchenQuery(
  state: KitchenFilterState,
  q: string,
): KitchenQuery {
  const kind =
    state.tab === "plans"
      ? "PLAN"
      : state.tab === "orders"
        ? "ORDERS"
        : undefined;
  return {
    date: state.date || undefined,
    kind,
    slot: state.slot || undefined,
    type: state.type || undefined,
    hasNotes: state.hasNotes,
    hasAddons: state.hasAddons,
    planId: state.tab === "plans" ? state.planId || undefined : undefined,
    changedOnly: state.tab === "plans" ? state.changedOnly : false,
    q: q.trim() || undefined,
    sort: state.sort,
  };
}

/** True when any narrowing filter (not date/tab/sort) is on. */
export function hasActiveFilters(state: KitchenFilterState): boolean {
  return Boolean(
    state.slot ||
    state.type ||
    state.hasNotes ||
    state.hasAddons ||
    state.planId ||
    state.changedOnly ||
    state.q,
  );
}
