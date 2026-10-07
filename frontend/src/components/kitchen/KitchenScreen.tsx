"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChefHat, ClipboardList, Package } from "lucide-react";
import { getKitchenMeta } from "@/lib/api/kitchen";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { formatDateStrShort } from "@/lib/format/date";
import { KitchenFilterBar } from "./KitchenFilterBar";
import { KitchenBoard } from "./KitchenBoard";
import { KitchenBoardSkeleton } from "./KitchenBoardSkeleton";
import { KitchenPrepSummary } from "./KitchenPrepSummary";
import {
  hasActiveFilters,
  toKitchenQuery,
  useKitchenFilters,
  type KitchenTab,
} from "./useKitchenFilters";

const TABS: { key: KitchenTab; label: string; icon: typeof Package }[] = [
  { key: "prep", label: "Prep summary", icon: ClipboardList },
  { key: "orders", label: "Orders", icon: Package },
  { key: "plans", label: "Plan deliveries", icon: CalendarClock },
];

/** The Kitchen screen: one day's cooking, with prep totals, regular orders
 * and (with Subscriptions) plan deliveries on separate tabs. */
export function KitchenScreen() {
  const { showToast } = useToast();
  const { data: meta, isError } = useQuery({
    queryKey: qk.admin("kitchen", "meta"),
    queryFn: getKitchenMeta,
    staleTime: STALE.long,
  });
  const { state, update } = useKitchenFilters(meta?.today);

  useEffect(() => {
    if (isError) showToast("Couldn't load the kitchen screen.", "error");
  }, [isError, showToast]);

  if (!meta) {
    return isError ? (
      <div className="card p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Couldn&apos;t load the kitchen screen. Try reloading the page.
      </div>
    ) : (
      <KitchenBoardSkeleton />
    );
  }

  const tabs = TABS.filter(
    (t) => t.key !== "plans" || meta.flags.subscriptions,
  );
  // A shared link to the plan tab still opens for a business without plans.
  const tab = tabs.some((t) => t.key === state.tab) ? state.tab : "orders";
  const view = { ...state, tab };
  const query = toKitchenQuery(view, state.q);
  const dayLabel =
    state.date === meta.today ? "Today" : formatDateStrShort(state.date);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary-600">
          <ChefHat className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Kitchen
          </h2>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{dayLabel}</p>
      </div>

      <div className="-mx-1 scrollbar-hidden flex gap-1 overflow-x-auto border-b border-zinc-200 px-1 dark:border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              update({ tab: t.key, planId: "", changedOnly: false, type: "" })
            }
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <KitchenFilterBar meta={meta} state={view} onChange={update} />

      {tab === "prep" ? (
        <KitchenPrepSummary
          query={query}
          category={state.category}
          onCategoryChange={(category) => update({ category })}
        />
      ) : (
        <KitchenBoard
          query={query}
          stage={state.stage}
          onStageChange={(stage) => update({ stage })}
          canUpdate={meta.canUpdate}
          filtered={hasActiveFilters(view)}
          emptyTitle={
            tab === "plans"
              ? `No plan deliveries for ${dayLabel.toLowerCase()}.`
              : `No orders for ${dayLabel.toLowerCase()}.`
          }
        />
      )}
    </div>
  );
}
