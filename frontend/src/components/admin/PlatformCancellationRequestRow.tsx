"use client";

import Link from "next/link";
import type {
  PlatformCancellationRequest,
  PlatformCancellationRequestStatus,
} from "@/lib/api/platform-cancellation-requests";

const STATUS_STYLES: Record<PlatformCancellationRequestStatus, string> = {
  PENDING: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  RESOLVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const NEXT_STATUS: Record<
  PlatformCancellationRequestStatus,
  PlatformCancellationRequestStatus | null
> = {
  PENDING: "CONTACTED",
  CONTACTED: "RESOLVED",
  RESOLVED: null,
};

export function PlatformCancellationRequestRow({
  request,
  onUpdateStatus,
}: {
  request: PlatformCancellationRequest;
  onUpdateStatus: (id: string, status: PlatformCancellationRequestStatus) => void;
}) {
  const next = NEXT_STATUS[request.status];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/platform/tenants/${request.tenantId}`}
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {request.tenant.name}
          </Link>
          <span className={`badge ${STATUS_STYLES[request.status]}`}>{request.status}</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(request.createdAt).toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-zinc-400">{request.reason}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {next && (
          <button
            type="button"
            onClick={() => onUpdateStatus(request.id, next)}
            className="btn-outline btn-sm"
          >
            Mark {next.toLowerCase()}
          </button>
        )}
      </div>
    </div>
  );
}
