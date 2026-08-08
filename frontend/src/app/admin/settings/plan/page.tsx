"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import {
  ApiError,
  getMyEligiblePlans,
  switchPlatformPlan,
  type EligiblePlansResponse,
} from "@/lib/api/admin-platform-plans";
import { getMyUsage, type UsageSummary } from "@/lib/api/tenant-limits";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { EligiblePlanCard } from "@/components/admin/EligiblePlanCard";
import { formatPriceFromPaise } from "@/lib/format/currency";

export default function MyPlanPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [eligible, setEligible] = useState<EligiblePlansResponse | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  function reload() {
    getMyEligiblePlans()
      .then(setEligible)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load plans."),
      );
    getMyUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }

  useEffect(reload, []);

  function handleSwitch(planId: string, planName: string, isUpgrade: boolean) {
    confirm({
      message: isUpgrade
        ? `Switch to ${planName}? You'll be charged a prorated amount right away.`
        : `Switch to ${planName}? This takes effect at the end of your current billing cycle.`,
      confirmLabel: isUpgrade ? "Upgrade" : "Switch",
      processingLabel: "Switching…",
      onConfirm: async () => {
        setSwitchingId(planId);
        try {
          const result = await switchPlatformPlan(planId);
          showToast(
            result.scheduled
              ? "Switch scheduled for the end of your current cycle."
              : "Plan switched — the new limits are active now.",
            "success",
          );
          reload();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't switch plans.", "error");
        } finally {
          setSwitchingId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Gauge className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">My Plan</h2>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!eligible ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="card flex flex-col gap-2 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Current plan</h3>
            <p className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatPriceFromPaise(eligible.currentAmountInPaise)}
            </p>
            {usage && (
              <div className="mt-2 grid grid-cols-1 gap-3 text-xs text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
                <p>
                  Orders this month: {usage.orders.used}
                  {usage.orders.max !== null ? ` / ${usage.orders.max}` : " (unlimited)"}
                </p>
                <p>
                  Active subscribers: {usage.subscribers.used}
                  {usage.subscribers.max !== null ? ` / ${usage.subscribers.max}` : " (unlimited)"}
                </p>
              </div>
            )}
          </div>

          {eligible.plans.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No other plans available to switch to right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eligible.plans.map((plan) => (
                <EligiblePlanCard
                  key={plan.id}
                  plan={plan}
                  busy={switchingId === plan.id}
                  onSwitch={() => handleSwitch(plan.id, plan.name, plan.isUpgrade)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
