"use client";

import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { ApiError, getTenant, type TenantDetail } from "@/lib/api/platform";
import { qk, STALE } from "@/lib/query/keys";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormSkeleton } from "@/components/ui/skeletons/FormSkeleton";
import { TenantBasicsCard } from "@/components/admin/TenantBasicsCard";
import { TenantBillingCard } from "@/components/admin/TenantBillingCard";
import { TenantNotificationCredentialsCard } from "@/components/admin/TenantNotificationCredentialsCard";
import { TenantPaymentCredentialsCard } from "@/components/admin/TenantPaymentCredentialsCard";
import { TenantPermissionGridCard } from "@/components/admin/TenantPermissionGridCard";
import { TenantFeatureGridCard } from "@/components/admin/TenantFeatureGridCard";
import { TenantLimitsCard } from "@/components/admin/TenantLimitsCard";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: tenant, error: queryError } = useQuery({
    queryKey: qk.admin("platform", "tenants", id),
    queryFn: () => getTenant(id),
    staleTime: STALE.short,
  });
  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Couldn't load tenant."
    : null;

  // A card saved: show the returned tenant at once, then refresh this
  // tenant's whole subtree (invoices, grants, limits) and the tenants list.
  function handleSaved(next: TenantDetail) {
    queryClient.setQueryData(qk.admin("platform", "tenants", id), next);
    void queryClient.invalidateQueries({ queryKey: qk.admin("platform", "tenants") });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/platform/tenants"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tenants
      </Link>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!tenant ? (
        error ? null : (
          <>
            <div className="flex items-center gap-2" aria-busy="true">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </div>
            <FormSkeleton fields={3} columns={3} cards={3} />
          </>
        )
      ) : (
        <>
          <div className="flex items-center gap-2 text-primary-600">
            <Building2 className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {tenant.businessProfile?.displayName ?? tenant.name}
            </h2>
          </div>

          <TenantBasicsCard tenant={tenant} onSaved={handleSaved} />
          <TenantBillingCard tenant={tenant} onSaved={handleSaved} />
          <TenantNotificationCredentialsCard tenant={tenant} onSaved={handleSaved} />
          <TenantPaymentCredentialsCard tenant={tenant} onSaved={handleSaved} />
          <TenantPermissionGridCard tenantId={id} />
          <TenantFeatureGridCard tenantId={id} />
          <TenantLimitsCard tenantId={id} />
        </>
      )}
    </div>
  );
}
