"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { listDisruptions } from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format/date";

export default function DisruptionsAdminPage() {
  const [page, setPage] = useState(1);
  // isPlaceholderData: a not-yet-cached page shows skeleton rows, not the old page.
  const { data, isError, isPlaceholderData } = useQuery({
    queryKey: qk.admin("subscriptions", "disruptions", page),
    queryFn: () => listDisruptions({ page, limit: 20 }),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const disruptions = data?.data;
  const meta = data?.meta;
  const error = isError ? "Couldn't load disruptions." : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/subscriptions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to subscriptions
      </Link>

      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Declared Disruptions
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Every real-world disruption you&apos;ve declared — each credited its affected subscriber(s)
        extra days and skipped that date&apos;s delivery, without touching any order already placed.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!disruptions || isPlaceholderData ? (
        isError ? null : (
          <div className="card flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-1.5 h-4 w-56" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : disruptions.length === 0 ? (
        <EmptyState compact title="No disruptions declared yet." />
      ) : (
        <div className="card flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {disruptions.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {d.date}
                  </span>
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    {d.plan ? d.plan.name : "1 subscriber"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {d.reason}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-400">
                <p>
                  {d._count.skips} affected · +{d.compensationDays} day
                  {d.compensationDays === 1 ? "" : "s"}
                </p>
                <p>{formatDate(d.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} disruptions
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-outline btn-sm"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
