"use client";

import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { EligiblePlan } from "@/lib/api/admin-platform-plans";
import { formatPriceFromPaise } from "@/lib/format/currency";

export function EligiblePlanCard({
  plan,
  busy,
  onSwitch,
}: {
  plan: EligiblePlan;
  busy: boolean;
  onSwitch: () => void;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
        {plan.isUpgrade ? (
          <span className="badge gap-1 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            <ArrowUpCircle className="h-3 w-3" />
            Upgrade
          </span>
        ) : (
          <span className="badge gap-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <ArrowDownCircle className="h-3 w-3" />
            Downgrade
          </span>
        )}
      </div>
      <p className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {formatPriceFromPaise(plan.priceInPaise)}
        <span className="text-sm font-normal text-zinc-400">
          /{plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
        </span>
      </p>
      <ul className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <li>Up to {plan.defaultMaxOrdersPerMonth} orders/month</li>
        <li>Up to {plan.defaultMaxSubscribers} active subscribers</li>
      </ul>
      <p className="text-xs text-zinc-400">
        {plan.isUpgrade
          ? "Prorated and applied immediately."
          : "Takes effect at the end of your current billing cycle."}
      </p>
      <button type="button" onClick={onSwitch} disabled={busy} className="btn-outline btn-sm w-fit">
        {busy ? "Switching…" : plan.isUpgrade ? "Upgrade" : "Switch"}
      </button>
    </div>
  );
}
