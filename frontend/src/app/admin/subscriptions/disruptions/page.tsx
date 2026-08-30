"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { listDisruptions, type SubscriptionDisruption } from "@/lib/api/admin-subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PaginationMeta } from "@/lib/api/response";

export default function DisruptionsAdminPage() {
  const [disruptions, setDisruptions] = useState<SubscriptionDisruption[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDisruptions({ page, limit: 20 })
      .then((res) => {
        setDisruptions(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError("Couldn't load disruptions."));
  }, [page]);

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

      {!disruptions ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : disruptions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No disruptions declared yet.</p>
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
                <p>{new Date(d.createdAt).toLocaleDateString()}</p>
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
