"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  ApiError,
  listPlatformLeads,
  updatePlatformLeadStatus,
  type PlatformLead,
  type PlatformLeadStatus,
} from "@/lib/api/platform-leads";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformLeadRow } from "@/components/admin/PlatformLeadRow";

export default function PlatformLeadsAdminPage() {
  const [leads, setLeads] = useState<PlatformLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    listPlatformLeads()
      .then(setLeads)
      .catch(() => setError("Couldn't load leads."));
  }, []);

  async function handleUpdateStatus(id: string, status: PlatformLeadStatus) {
    try {
      const updated = await updatePlatformLeadStatus(id, status);
      setLeads((prev) => prev?.map((l) => (l.id === id ? updated : l)) ?? null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update lead.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <UserPlus className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Leads</h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cold leads from the marketing site&apos;s &quot;contact us&quot; form, plus upgrade requests
        from already-active tenants (tagged &quot;Existing tenant&quot;) — every platform-plan sale
        goes through you manually, never an unattended signup.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!leads ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : leads.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No leads yet.</p>
      ) : (
        <div className="card flex flex-col gap-2 p-6">
          {leads.map((lead) => (
            <PlatformLeadRow key={lead.id} lead={lead} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
