"use client";

import type { PlatformLead, PlatformLeadStatus } from "@/lib/api/platform-leads";

const STATUS_STYLES: Record<PlatformLeadStatus, string> = {
  NEW: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  CONVERTED: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  DISMISSED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const NEXT_STATUS: Record<PlatformLeadStatus, PlatformLeadStatus | null> = {
  NEW: "CONTACTED",
  CONTACTED: "CONVERTED",
  CONVERTED: null,
  DISMISSED: null,
};

export function PlatformLeadRow({
  lead,
  onUpdateStatus,
}: {
  lead: PlatformLead;
  onUpdateStatus: (id: string, status: PlatformLeadStatus) => void;
}) {
  const next = NEXT_STATUS[lead.status];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {lead.businessName}
          </span>
          <span className={`badge ${STATUS_STYLES[lead.status]}`}>{lead.status}</span>
          {lead.tenantId && (
            <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Existing tenant
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {lead.contactEmail}
          {lead.contactPhone ? ` · ${lead.contactPhone}` : ""}
          {lead.plan ? ` · Interested in ${lead.plan.name}` : ""}
        </p>
        {lead.message && <p className="mt-1 text-xs text-zinc-400">{lead.message}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {next && (
          <button
            type="button"
            onClick={() => onUpdateStatus(lead.id, next)}
            className="btn-outline btn-sm"
          >
            Mark {next.toLowerCase()}
          </button>
        )}
        {lead.status !== "DISMISSED" && lead.status !== "CONVERTED" && (
          <button
            type="button"
            onClick={() => onUpdateStatus(lead.id, "DISMISSED")}
            className="btn-ghost btn-sm"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
