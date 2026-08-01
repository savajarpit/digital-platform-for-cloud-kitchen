"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { ApiError, listTenants, type TenantListItem } from "@/lib/api/platform";
import { Skeleton } from "@/components/ui/Skeleton";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  INACTIVE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  SUSPENDED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const BILLING_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PAST_DUE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTenants()
      .then(setTenants)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Couldn't load tenants."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <Building2 className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Tenants
          </h2>
        </div>
        <Link href="/admin/platform/tenants/new" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" />
          New Tenant
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!tenants ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Billing</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-zinc-50 last:border-none hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/platform/tenants/${tenant.id}`}
                      className="flex items-center gap-1.5 font-medium text-zinc-900 hover:text-primary-600 dark:text-zinc-100"
                    >
                      {tenant.businessProfile?.displayName ?? tenant.name}
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {tenant.users[0]?.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {tenant.customDomain ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{tenant.plan}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${STATUS_STYLES[tenant.status] ?? ""}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {tenant.platformSubscription ? (
                      <span
                        className={`badge ${BILLING_STATUS_STYLES[tenant.platformSubscription.status] ?? ""}`}
                      >
                        {tenant.platformSubscription.status.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">Not set up</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No tenants yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
