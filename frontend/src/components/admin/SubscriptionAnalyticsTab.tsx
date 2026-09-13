"use client";

import { useEffect, useState } from "react";
import { IndianRupee, TrendingDown, UserPlus, Users } from "lucide-react";
import {
  ApiError,
  getSubscriptionAnalytics,
  listPlansAdmin,
  type Plan,
  type SubscriptionAnalytics,
} from "@/lib/api/admin-subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { SubscriptionRevenueTrendChart } from "@/components/admin/SubscriptionRevenueTrendChart";
import { ExpiringSoonCard } from "@/components/admin/ExpiringSoonCard";
import { formatPriceFromPaise } from "@/lib/format/currency";

type RangePreset = "14" | "30" | "custom";
const ALL_PLANS = "all";

export function SubscriptionAnalyticsTab() {
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [planId, setPlanId] = useState(ALL_PLANS);
  const [preset, setPreset] = useState<RangePreset>("14");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customReady =
    preset !== "custom" || (customFrom !== "" && customTo !== "" && customFrom <= customTo);

  useEffect(() => {
    listPlansAdmin({ limit: 100 })
      .then((res) => setPlans(res.data))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    if (!customReady) return;
    const params = {
      ...(preset === "custom" ? { from: customFrom, to: customTo } : { days: Number(preset) }),
      ...(planId !== ALL_PLANS ? { planId } : {}),
    };
    getSubscriptionAnalytics(params)
      .then(setAnalytics)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load subscription analytics."),
      );
  }, [preset, customFrom, customTo, customReady, planId]);

  const rangeLabel =
    preset === "custom" && customReady ? `${customFrom} to ${customTo}` : `last ${preset} days`;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {plans && plans.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Plan</span>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PLANS}>All plans</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analytics ? (
          <>
            <StatTile
              icon={UserPlus}
              label="New Subscribers Today"
              value={String(analytics.newSubscribersToday)}
            />
            <StatTile
              icon={Users}
              label="Active Subscribers"
              value={String(analytics.activeSubscribers)}
              sublabel="Right now"
            />
            <StatTile
              icon={IndianRupee}
              label="Net Revenue"
              value={formatPriceFromPaise(analytics.netRevenueInPaise)}
              sublabel={rangeLabel}
            />
            <StatTile
              icon={TrendingDown}
              label="Refunded"
              value={formatPriceFromPaise(analytics.refundedInPaise)}
              sublabel={rangeLabel}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
            </div>
          ))
        )}
      </div>

      <SubscriptionRevenueTrendChart
        trend={analytics?.revenueTrend ?? null}
        grossRevenueInPaise={analytics?.grossRevenueInPaise ?? null}
        newSubscribersInRange={analytics?.newSubscribersInRange ?? null}
        rangeLabel={rangeLabel}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanBreakdownCard breakdown={analytics?.planBreakdown ?? null} rangeLabel={rangeLabel} />
        <ExpiringSoonCard />
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      {sublabel && <p className="text-xs text-zinc-400 dark:text-zinc-500">{sublabel}</p>}
    </div>
  );
}

function PlanBreakdownCard({
  breakdown,
  rangeLabel,
}: {
  breakdown: SubscriptionAnalytics["planBreakdown"] | null;
  rangeLabel: string;
}) {
  const max = Math.max(1, ...(breakdown ?? []).map((b) => b.revenueInPaise));

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Revenue by Plan — {rangeLabel}
      </h3>
      {!breakdown ? (
        <Skeleton className="h-32 w-full" />
      ) : breakdown.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No subscribers in this period.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {breakdown.map((p) => (
            <div key={p.planId} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-zinc-600 dark:text-zinc-400">
                {p.planName}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.max(4, (p.revenueInPaise / max) * 100)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {formatPriceFromPaise(p.revenueInPaise)}
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-zinc-400">
                {p.subscriberCount} sub{p.subscriberCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
