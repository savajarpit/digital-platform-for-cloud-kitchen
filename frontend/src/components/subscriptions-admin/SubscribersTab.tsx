"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardPlus, Search, Users } from "lucide-react";
import {
  listPlansAdmin,
  listSubscriptionsAdmin,
  type AdminSubscription,
} from "@/lib/api/admin-subscriptions";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/skeletons/TableSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatPriceFromPaise } from "@/lib/format/currency";

const SUBSCRIPTION_STATUS_STYLES: Record<AdminSubscription["status"], string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const COLUMNS = 6;

export function SubscribersTab() {
  const canCreateManual = usePermission(PERMISSIONS.SUBSCRIPTIONS_MANUAL_CREATE);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planId, setPlanId] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const plansQuery = useQuery({
    queryKey: qk.admin("subscriptions", "plans", "options"),
    queryFn: () => listPlansAdmin({ limit: 100 }),
    staleTime: STALE.short,
  });
  const plans = plansQuery.data?.data ?? [];

  // Every input of the request is in the key; while the next page/filter loads
  // the previous rows stay on screen (no skeleton flash, no remount).
  const { data, isError } = useQuery({
    queryKey: qk.admin("subscriptions", "list", { page, search: debouncedSearch, planId }),
    queryFn: () =>
      listSubscriptionsAdmin({
        page,
        search: debouncedSearch || undefined,
        planId: planId || undefined,
      }),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const subs: AdminSubscription[] | undefined = data?.data;
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canCreateManual && (
          <Link href="/admin/subscriptions/new" className="btn-primary btn-sm">
            <ClipboardPlus className="h-4 w-4" />
            New Subscription
          </Link>
        )}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search subscribers…"
            className="input w-full pl-8"
          />
        </div>
        <Select
          value={planId}
          onValueChange={(v) => {
            setPlanId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All plans</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!subs ? (
        isError ? (
          <EmptyState compact icon={Users} title="Couldn't load subscribers." />
        ) : (
          <TableSkeleton cols={COLUMNS} />
        )
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Coupon / Bonus</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="text-zinc-900 hover:text-primary-600 hover:underline dark:text-zinc-100"
                      >
                        {sub.user.firstName} {sub.user.lastName ?? ""}
                      </Link>
                      <div className="text-xs text-zinc-400">{sub.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{sub.planNameSnapshot}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[sub.status]}`}>
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {sub.couponCode ? <span className="font-mono">{sub.couponCode}</span> : "—"}
                      {sub.bonusDaysGranted > 0 && (
                        <span className="ml-1.5 badge bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400">
                          +{sub.bonusDaysGranted}d
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
                      {" – "}
                      {sub.cycleEnd ? new Date(sub.cycleEnd).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
                    </td>
                  </tr>
                ))}

                {subs.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS}>
                      <EmptyState
                        compact
                        title={
                          debouncedSearch || planId
                            ? "No subscribers match."
                            : "No customer subscriptions yet."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                Page {meta.page} of {meta.totalPages} · {meta.total} subscribers
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!meta.hasPrev}
                  className="btn-outline btn-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNext}
                  className="btn-outline btn-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
