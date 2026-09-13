"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCompactPriceFromPaise, formatPriceFromPaise } from "@/lib/format/currency";
import type { SubscriptionAnalytics } from "@/lib/api/admin-subscriptions";

type RangePreset = "14" | "30" | "custom";
type TrendPoint = SubscriptionAnalytics["revenueTrend"][number];

/** Same bar-chart shape as the Orders Overview's RevenueTrendChart (single
 * hue, hover tooltip, table-view toggle) — a separate component rather than
 * a shared one since the two feed off differently-shaped range state
 * (order revenue vs. subscription signup revenue), but visually consistent
 * on purpose so the two dashboards read as one system. */
export function SubscriptionRevenueTrendChart({
  trend,
  grossRevenueInPaise,
  newSubscribersInRange,
  rangeLabel,
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: {
  trend: TrendPoint[] | null;
  grossRevenueInPaise: number | null;
  newSubscribersInRange: number | null;
  rangeLabel: string;
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...(trend ?? []).map((t) => t.valueInPaise));
  const today = new Date().toISOString().slice(0, 10);
  const hasData = (trend ?? []).some((t) => t.count > 0);
  const labelEvery = trend ? Math.max(1, Math.ceil(trend.length / 12)) : 1;
  const barWidthClass = !trend || trend.length <= 31 ? "w-6" : trend.length <= 120 ? "w-3" : "w-2";
  const showValueLabels = barWidthClass === "w-6";

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Subscription Revenue
        </h3>
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
            No new subscribers in this period
          </p>
        </div>
      ) : showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">New Subscribers</th>
                <th className="py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((day) => (
                <tr key={day.date} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{day.date}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{day.count}</td>
                  <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPriceFromPaise(day.valueInPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto pt-14 pb-1">
          {showValueLabels && (
            <div className="flex gap-1">
              {trend.map((day) => (
                <div key={day.date} className={`shrink-0 text-center ${barWidthClass}`}>
                  <span className="text-[10px] font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {day.valueInPaise > 0 ? formatCompactPriceFromPaise(day.valueInPaise) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex h-36 items-end gap-1">
            {trend.map((day, i) => {
              const heightPct = Math.max(2, (day.valueInPaise / max) * 100);
              const tooltipPositionClass =
                i <= 1 ? "left-0" : i >= trend.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2";
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
                    <div
                      className={`absolute bottom-full ${tooltipPositionClass} z-20 mb-1.5 w-max rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800`}
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{day.date}</div>
                      <div className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatPriceFromPaise(day.valueInPaise)}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400">
                        {day.count} new subscriber{day.count === 1 ? "" : "s"}
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

      {trend && (
        <div className="flex flex-wrap items-center gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Gross revenue — {rangeLabel}</p>
            <p className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {grossRevenueInPaise != null ? formatPriceFromPaise(grossRevenueInPaise) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">New subscribers — {rangeLabel}</p>
            <p className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {newSubscribersInRange ?? "—"}
            </p>
          </div>
        </div>
      )}
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
