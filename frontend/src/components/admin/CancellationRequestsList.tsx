"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import {
  type CancellationKind,
  type CancellationRequestStatus,
  listCancellationRequests,
} from "@/lib/api/cancellation-requests";
import { qk } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardGridSkeleton } from "@/components/ui/skeletons/CardGridSkeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";

const FILTERS: { key: CancellationRequestStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
  { key: "ALL", label: "All" },
];

const STATUS_STYLES: Record<CancellationRequestStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  REJECTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  WITHDRAWN: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const STATUS_LABELS: Record<CancellationRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Cancelled",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Customers' cancellation requests of one kind, newest first — pending by
 * default, since those are the ones waiting on the kitchen. Each card links
 * to the subscription/order, where Approve & refund / Reject live. */
export function CancellationRequestsList({ kind }: { kind: CancellationKind }) {
  const [filter, setFilter] = useState<CancellationRequestStatus | "ALL">(
    "PENDING",
  );
  const [page, setPage] = useState(1);
  const status = filter === "ALL" ? undefined : filter;
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: qk.admin("cancellation-requests", "list", kind, filter, page),
    queryFn: () => listCancellationRequests(kind, { status, page }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const requests = data?.data ?? [];
  const meta = data?.meta;
  const basePath =
    kind === "SUBSCRIPTION" ? "/admin/subscriptions" : "/admin/orders";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter requests"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <CardGridSkeleton count={3} gridClassName="grid grid-cols-1 gap-3" />
      ) : isError ? (
        <EmptyState
          compact
          title="Couldn't load requests"
          description="Please refresh and try again."
        />
      ) : requests.length === 0 ? (
        <EmptyState
          compact
          icon={Inbox}
          title={
            filter === "PENDING" ? "No pending requests" : "Nothing here yet"
          }
          description={
            filter === "PENDING"
              ? "When a customer asks to cancel, it shows up here and you get an email."
              : undefined
          }
        />
      ) : (
        <ul
          className={`flex flex-col gap-3 ${isPlaceholderData ? "opacity-60" : ""}`}
        >
          {requests.map((r) => {
            const targetId = r.subscription?.id ?? r.order?.id;
            const customer = [r.user.firstName, r.user.lastName]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={r.id}>
                <Link
                  href={`${basePath}/${targetId}`}
                  className="card card-hover flex cursor-pointer flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {r.subscription?.planNameSnapshot ??
                        `Order ${r.order?.orderNumber}`}
                      {r.order && (
                        <span className="font-normal text-zinc-500">
                          {" "}
                          · {formatPriceFromPaise(r.order.totalInPaise)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs break-all text-zinc-500 dark:text-zinc-400">
                      {customer} · {r.user.email}
                      {r.user.phone ? ` · ${r.user.phone}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium">{r.reasonLabel}</span>
                      {r.note ? ` — “${r.note}”` : ""}
                    </p>
                    {r.status === "REJECTED" && r.resolutionNote && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Your note: {r.resolutionNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <span className={`badge ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-outline btn-sm cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-outline btn-sm cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
