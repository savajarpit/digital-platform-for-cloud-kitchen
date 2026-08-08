"use client";

import { useEffect, useState } from "react";
import {
  getPrepPlan,
  listPlansAdmin,
  type MealSlotType,
  type Plan,
  type PrepPlan,
} from "@/lib/api/admin-subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";

const SLOT_LABELS: Record<MealSlotType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export function PrepPlannerView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [result, setResult] = useState<PrepPlan | null>(null);

  useEffect(() => {
    listPlansAdmin({ limit: 100 })
      .then(({ data }) => {
        setPlans(data);
        if (data[0]) setPlanId(data[0].id);
      })
      .catch(() => setPlans([]));
  }, []);

  const selectedPlan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (!planId) return;
    getPrepPlan(planId, dayNumber)
      .then(setResult)
      .catch(() => setResult(null));
  }, [planId, dayNumber]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pick a plan and a day of its template — this shows what you&apos;d need to prepare if every
        active subscriber on that plan were on that day, not just today&apos;s actual deliveries.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Plan</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="input py-1.5 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Day</label>
          <select
            value={dayNumber}
            onChange={(e) => setDayNumber(Number(e.target.value))}
            className="input py-1.5 text-sm"
            disabled={!selectedPlan}
          >
            {Array.from({ length: selectedPlan?.durationDays ?? 1 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Day {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No plans yet — create one first.</p>
      ) : !result ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="card flex flex-col gap-2 p-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {result.subscriberCount} active subscriber{result.subscriberCount === 1 ? "" : "s"} on{" "}
            {result.planName}
          </p>
          {result.items.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No meals set for this day yet.</p>
          ) : (
            result.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-zinc-50 py-2 last:border-none dark:border-zinc-900"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {SLOT_LABELS[item.slotType]} · {item.mealName}
                </span>
                <span className="font-display text-lg font-bold text-primary-600">×{item.quantity}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
