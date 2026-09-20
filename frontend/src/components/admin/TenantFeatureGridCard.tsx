"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Puzzle } from "lucide-react";
import { ApiError, getTenantFeatures, setFeatureGrant, type FeatureGrant } from "@/lib/api/platform";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
import { TenantGrantRowsSkeleton } from "@/components/admin/TenantGrantRowsSkeleton";

export function TenantFeatureGridCard({ tenantId }: { tenantId: string }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const featuresKey = qk.admin("platform", "tenants", tenantId, "features");
  const { data: features, isError } = useQuery({
    queryKey: featuresKey,
    queryFn: () => getTenantFeatures(tenantId),
    staleTime: STALE.short,
  });

  function patchFeature(key: string, enabled: boolean) {
    queryClient.setQueryData<FeatureGrant[]>(featuresKey, (prev) =>
      prev ? prev.map((f) => (f.key === key ? { ...f, enabled } : f)) : prev,
    );
  }

  async function toggle(feature: FeatureGrant) {
    const next = !feature.enabled;
    patchFeature(feature.key, next);
    try {
      await setFeatureGrant(tenantId, feature.key, next);
      void queryClient.invalidateQueries({ queryKey: qk.admin("platform", "tenants", tenantId) });
      showToast(`Feature ${next ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update feature.", "error");
      patchFeature(feature.key, !next);
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Feature Entitlement
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Which whole features this tenant has access to at all — separate from role permissions
        above.
      </p>

      {!features ? (
        isError ? <EmptyState compact title="Couldn't load features." /> : <TenantGrantRowsSkeleton />
      ) : (
        <div className="flex flex-col gap-2">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {feature.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{feature.description}</p>
              </div>
              <Toggle checked={feature.enabled} onChange={() => toggle(feature)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
