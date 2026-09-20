"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import {
  ApiError,
  getRoleGrants,
  setPermissionGrant,
  type PermissionGrant,
} from "@/lib/api/platform";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
import { TenantGrantRowsSkeleton } from "@/components/admin/TenantGrantRowsSkeleton";

const ROLES = ["OWNER", "STAFF"] as const;

export function TenantPermissionGridCard({ tenantId }: { tenantId: string }) {
  const [role, setRole] = useState<(typeof ROLES)[number]>("OWNER");

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Role Permissions
        </h3>
      </div>

      <div className="flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
              role === r
                ? "bg-primary-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* The role is part of the query key, so each role is cached on its own —
          no remount needed, and one role's grants never show under the other. */}
      <RoleGrantsList tenantId={tenantId} role={role} />
    </div>
  );
}

function RoleGrantsList({
  tenantId,
  role,
}: {
  tenantId: string;
  role: (typeof ROLES)[number];
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const grantsKey = qk.admin("platform", "tenants", tenantId, "role-grants", role);
  const { data: grants, isError } = useQuery({
    queryKey: grantsKey,
    queryFn: () => getRoleGrants(tenantId, role),
    staleTime: STALE.short,
  });

  function patchGrant(key: string, granted: boolean) {
    queryClient.setQueryData<PermissionGrant[]>(grantsKey, (prev) =>
      prev ? prev.map((g) => (g.key === key ? { ...g, granted } : g)) : prev,
    );
  }

  async function toggle(grant: PermissionGrant) {
    const next = !grant.granted;
    patchGrant(grant.key, next);
    try {
      await setPermissionGrant(tenantId, role, grant.key, next);
      void queryClient.invalidateQueries({ queryKey: qk.admin("platform", "tenants", tenantId) });
      showToast(`Permission ${next ? "granted" : "revoked"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update permission.", "error");
      patchGrant(grant.key, !next);
    }
  }

  if (!grants) {
    if (isError) return <EmptyState compact title="Couldn't load permissions." />;
    return <TenantGrantRowsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-2">
      {grants.map((grant) => (
        <div
          key={grant.key}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {grant.description}
            </p>
            <p className="font-mono text-xs text-zinc-400">{grant.key}</p>
          </div>
          <Toggle checked={grant.granted} onChange={() => toggle(grant)} />
        </div>
      ))}
    </div>
  );
}
