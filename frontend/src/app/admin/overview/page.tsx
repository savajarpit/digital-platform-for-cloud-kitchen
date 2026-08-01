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

export default function OverviewPage() {
  const [overview, setOverview] = useState<OrdersOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrdersOverview()
      .then(setOverview)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load overview."),
      );
  }, []);

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

      {!overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <StatTile
              icon={Users}
              label="Total Customers"
              value={String(overview.totalCustomers)}
            />
          </div>

          <RevenueTrendChart trend={overview.revenueTrend} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusBreakdownCard breakdown={overview.statusBreakdown} />
            <TopMealsCard meals={overview.topMeals} />
          </div>
        </>
      )}
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

function RevenueTrendChart({ trend }: { trend: OrdersOverview["revenueTrend"] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...trend.map((t) => t.revenueInPaise));

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Revenue — last 14 days
        </h3>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="cursor-pointer text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
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
        <div className="relative flex h-40 items-end gap-1">
          {trend.map((day, i) => {
            const heightPct = Math.max(2, (day.revenueInPaise / max) * 100);
            return (
              <div
                key={day.date}
                className="group relative flex-1"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <div
                  className="mx-auto w-full max-w-6 rounded-t-sm bg-primary-500 transition-colors group-hover:bg-primary-600"
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
      )}
    </div>
  );
}

function StatusBreakdownCard({ breakdown }: { breakdown: OrdersOverview["statusBreakdown"] }) {
  const max = Math.max(1, ...breakdown.map((b) => b.count));
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Orders by Status
        </h3>
      </div>
      {total === 0 ? (
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

function TopMealsCard({ meals }: { meals: OrdersOverview["topMeals"] }) {
  const max = Math.max(1, ...meals.map((m) => m.quantitySold));

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Top Meals — last 14 days
        </h3>
      </div>
      {meals.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No paid orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
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
