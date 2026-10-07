"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodaysDeliveries, type TodaysDeliveries } from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapLink } from "@/components/ui/MapLink";
import { ShareOrderDetailsButton } from "@/components/ui/ShareOrderDetailsButton";
import { PrepPlannerView } from "@/components/admin/PrepPlannerView";
import { formatTime12h } from "@/lib/format/time";

const NO_DELIVERIES: TodaysDeliveries = { date: "", prepSheet: [], dispatch: [] };

export function TodaysDeliveriesTab() {
  const [view, setView] = useState<"prep" | "dispatch" | "planner">("prep");
  const { data: loaded, isError } = useQuery({
    queryKey: qk.admin("subscriptions", "today"),
    queryFn: getTodaysDeliveries,
    staleTime: STALE.short,
  });
  const data = loaded ?? (isError ? NO_DELIVERIES : null);

  if (!data) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-72 rounded-lg" />
        </div>
        <div className="card flex flex-col gap-2 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-zinc-50 py-2 last:border-none dark:border-zinc-900"
            >
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = data.prepSheet.length === 0 && data.dispatch.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {data.date && new Date(data.date).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
        </p>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setView("prep")}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              view === "prep"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Kitchen Prep Sheet
          </button>
          <button
            type="button"
            onClick={() => setView("dispatch")}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              view === "dispatch"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Dispatch List
          </button>
          <button
            type="button"
            onClick={() => setView("planner")}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              view === "planner"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Prep Planner
          </button>
        </div>
      </div>

      {view === "planner" ? (
        <PrepPlannerView />
      ) : isEmpty ? (
        <EmptyState compact title="No subscription deliveries scheduled for today." />
      ) : view === "prep" ? (
        <div className="card flex flex-col gap-2 p-6">
          {data.prepSheet.map((item) => (
            <div
              key={item.mealName}
              className="flex items-center justify-between border-b border-zinc-50 py-2 last:border-none dark:border-zinc-900"
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.mealName}</span>
              <span className="font-display text-lg font-bold text-primary-600">×{item.quantity}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.dispatch.map((d) => (
            <div key={d.orderId} className="card flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{d.customerName}</span>
                <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                  {d.deliverySlotName} ({formatTime12h(d.deliveryWindowStart)}–{formatTime12h(d.deliveryWindowEnd)})
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {d.planName} · {d.address.line1}
                  {d.address.line2 ? `, ${d.address.line2}` : ""}, {d.address.city}
                </span>
                <MapLink lat={d.address.lat} lng={d.address.lng} />
                <ShareOrderDetailsButton
                  details={{
                    heading: `Delivery — ${d.planName} (Order #${d.orderNumber})`,
                    customerName: d.customerName,
                    itemLines: d.meals,
                    deliverySlotName: d.deliverySlotName,
                    deliveryWindowStart: d.deliveryWindowStart,
                    deliveryWindowEnd: d.deliveryWindowEnd,
                    deliveryDateLabel: data.date
                      ? new Date(data.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })
                      : null,
                    // d.notes is the full materialized-order text (e.g.
                    // "Subscription: Plan — Week 1 · Fri — Note: no onions")
                    // — pull out just the customer-added tail so it doesn't
                    // repeat the plan name already shown in the heading.
                    note: d.notes?.includes("— Note: ") ? d.notes.split("— Note: ").pop() : null,
                    address: d.address,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-400">{d.meals.join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
