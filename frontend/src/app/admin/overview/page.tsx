"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  IndianRupee,
  ListOrdered,
  Users,
} from "lucide-react";
import { ApiError, getOrdersOverview, type OrdersOverview } from "@/lib/api/admin-orders";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-400 dark:bg-zinc-600",
  CONFIRMED: "bg-primary-500",
  PREPARING: "bg-amber-500",
  OUT_FOR_DELIVERY: "bg-secondary-500",
  DELIVERED: "bg-primary-600",
  CANCELLED: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

type RangePreset = "14" | "30" | "custom";

export default function OverviewPage() {
  const [overview, setOverview] = useState<OrdersOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<RangePreset>("14");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Waits for both custom dates before firing a request — an incomplete
  // custom range just keeps showing the last good data, not an error.
  const customReady =
    preset !== "custom" || (customFrom !== "" && customTo !== "" && customFrom <= customTo);

  useEffect(() => {
    if (!customReady) return;
    // Deliberately doesn't null out `overview` first — the last good range
    // keeps showing while the new one loads, no skeleton flash on every
    // filter change (only the very first load, from its useState(null)).
    const params =
      preset === "custom" ? { from: customFrom, to: customTo } : { days: Number(preset) };
    getOrdersOverview(params)
      .then(setOverview)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load overview."),
      );
  }, [preset, customFrom, customTo, customReady]);

  const rangeLabel =
    preset === "custom" && customReady ? `${customFrom} to ${customTo}` : `last ${preset} days`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <BarChart3 className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Overview
        </h2>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview ? (
          <>
            <StatTile
              icon={IndianRupee}
              label="Today's Revenue"
              value={formatPriceFromPaise(overview.today.revenueInPaise)}
              sublabel={`${overview.today.orders} order${overview.today.orders === 1 ? "" : "s"}`}
            />
            <StatTile
              icon={IndianRupee}
              label="Last 7 Days Revenue"
              value={formatPriceFromPaise(overview.last7Days.revenueInPaise)}
              sublabel={`${overview.last7Days.orders} order${overview.last7Days.orders === 1 ? "" : "s"}`}
            />
            <StatTile
              icon={ClipboardList}
              label="Active Orders"
              value={String(overview.activeOrders)}
              sublabel="Needs kitchen/delivery attention"
            />
            <StatTile icon={Users} label="Total Customers" value={String(overview.totalCustomers)} />
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

      <RevenueTrendChart
        trend={overview?.revenueTrend ?? null}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBreakdownCard breakdown={overview?.statusBreakdown ?? null} />
        <TopMealsCard meals={overview?.topMeals ?? null} rangeLabel={rangeLabel} />
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

function RangePresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary-600 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

/** Short "Jul 24" form for an x-axis label — the tooltip still shows the full YYYY-MM-DD. */
function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

function RevenueTrendChart({
  trend,
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: {
  trend: OrdersOverview["revenueTrend"] | null;
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...(trend ?? []).map((t) => t.revenueInPaise));
  const today = new Date().toISOString().slice(0, 10);
  const hasData = (trend ?? []).some((t) => t.orders > 0);
  // Aim for ~12 visible x-axis labels regardless of range length — every day
  // on a 14-day view, every ~30th on a full year, never a cramped smear.
  const labelEvery = trend ? Math.max(1, Math.ceil(trend.length / 12)) : 1;
  // Bars get a real minimum width instead of splitting the card's width
  // evenly — a 365-bar year would otherwise squash to invisible slivers.
  // The container scrolls horizontally instead.
  const barWidthClass = !trend || trend.length <= 31 ? "w-6" : trend.length <= 120 ? "w-3" : "w-2";

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Revenue</h3>
        <div className="flex flex-wrap items-center gap-2">
          <RangePresetButton active={preset === "14"} onClick={() => onPresetChange("14")}>
            14 days
          </RangePresetButton>
          <RangePresetButton active={preset === "30"} onClick={() => onPresetChange("30")}>
            Last 1 month
          </RangePresetButton>
          <RangePresetButton active={preset === "custom"} onClick={() => onPresetChange("custom")}>
            Custom
          </RangePresetButton>
          {trend && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="cursor-pointer text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {showTable ? "View as chart" : "View as table"}
            </button>
          )}
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            From
            <input
              type="date"
              value={customFrom}
              max={customTo || today}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="input px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            To
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="input px-2 py-1"
            />
          </label>
        </div>
      )}

      {!trend ? (
        <Skeleton className="h-40 w-full" />
      ) : !hasData ? (
        <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No data for this period
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            No paid orders between {trend[0]?.date} and {trend[trend.length - 1]?.date}
          </p>
        </div>
      ) : showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Orders</th>
                <th className="py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((day) => (
                <tr key={day.date} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{day.date}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{day.orders}</td>
                  <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPriceFromPaise(day.revenueInPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="relative flex h-40 items-end gap-1">
            {trend.map((day, i) => {
              const heightPct = Math.max(2, (day.revenueInPaise / max) * 100);
              return (
                <div
                  key={day.date}
                  className={`group relative flex h-full shrink-0 items-end ${barWidthClass}`}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  <div
                    className="w-full rounded-t-sm bg-primary-500 transition-colors group-hover:bg-primary-600"
                    style={{ height: `${heightPct}%` }}
                  />
                  {hoverIndex === i && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-1.5 w-max -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-zinc-700">
                      <div className="font-medium">{day.date}</div>
                      <div>{formatPriceFromPaise(day.revenueInPaise)}</div>
                      <div className="text-zinc-300">
                        {day.orders} order{day.orders === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {trend.map((day, i) => (
              <div key={day.date} className={`shrink-0 text-center ${barWidthClass}`}>
                {i % labelEvery === 0 && (
                  <span className="text-[10px] whitespace-nowrap text-zinc-400 dark:text-zinc-600">
                    {formatShortDate(day.date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBreakdownCard({ breakdown }: { breakdown: OrdersOverview["statusBreakdown"] | null }) {
  const max = Math.max(1, ...(breakdown ?? []).map((b) => b.count));
  const total = (breakdown ?? []).reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Orders by Status
        </h3>
      </div>
      {!breakdown ? (
        <Skeleton className="h-32 w-full" />
      ) : total === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {breakdown.map((b) => (
            <div key={b.status} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
                {STATUS_LABELS[b.status] ?? b.status}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${STATUS_BAR_COLORS[b.status] ?? "bg-zinc-400"}`}
                  style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopMealsCard({
  meals,
  rangeLabel,
}: {
  meals: OrdersOverview["topMeals"] | null;
  rangeLabel: string;
}) {
  const max = Math.max(1, ...(meals ?? []).map((m) => m.quantitySold));

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Top Meals — {rangeLabel}
        </h3>
      </div>
      {!meals ? (
        <Skeleton className="h-32 w-full" />
      ) : meals.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No paid orders yet.</p>
      ) : (
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
          {meals.map((meal, i) => (
            <div key={meal.mealId ?? meal.name} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-zinc-600 dark:text-zinc-400">
                {i + 1}. {meal.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.max(4, (meal.quantitySold / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {meal.quantitySold}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
