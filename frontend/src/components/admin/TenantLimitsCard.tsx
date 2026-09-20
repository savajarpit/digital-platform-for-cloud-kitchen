"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import {
  ApiError,
  getTenantLimits,
  updateTenantLimits,
  type TenantLimits,
} from "@/lib/api/platform";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { FormSkeleton } from "@/components/ui/skeletons/FormSkeleton";

export function TenantLimitsCard({ tenantId }: { tenantId: string }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setLimits] = useState<TenantLimits | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isError } = useQuery({
    queryKey: qk.admin("platform", "tenants", tenantId, "limits"),
    queryFn: () => getTenantLimits(tenantId),
    staleTime: STALE.short,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const limits = draft ?? data ?? null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!limits) return;
    setSaving(true);
    try {
      const updated = await updateTenantLimits(tenantId, {
        maxOrdersOverride: limits.maxOrdersOverride,
        maxSubscribersOverride: limits.maxSubscribersOverride,
        signupLimitEnabled: limits.signupLimitEnabled,
        maxSignupsPerMonth: limits.maxSignupsPerMonth,
      });
      queryClient.setQueryData(qk.admin("platform", "tenants", tenantId, "limits"), updated);
      setLimits(null);
      void queryClient.invalidateQueries({ queryKey: qk.admin("platform", "tenants") });
      showToast("Usage limits saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save limits.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!limits) {
    if (isError) {
      return (
        <div className="card p-6">
          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load usage limits.</p>
        </div>
      );
    }
    return <FormSkeleton fields={2} columns={2} />;
  }

  return (
    <form onSubmit={handleSave} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Usage Limits</h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Extra caps on top of this tenant&apos;s plan default — leave blank to just use the plan.
        Not fixed to the plan tier; adjust anytime (friends/family, special cases).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Max orders / month
          </label>
          <input
            type="number"
            min={0}
            value={limits.maxOrdersOverride ?? ""}
            onChange={(e) =>
              setLimits({
                ...limits,
                maxOrdersOverride: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Use plan default"
            className="input"
          />
          {limits.blockedOrderAttempts > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {limits.blockedOrderAttempts} order(s) blocked this month
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Max active subscribers
          </label>
          <input
            type="number"
            min={0}
            value={limits.maxSubscribersOverride ?? ""}
            onChange={(e) =>
              setLimits({
                ...limits,
                maxSubscribersOverride: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Use plan default"
            className="input"
          />
          {limits.blockedSubscriberAttempts > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {limits.blockedSubscriberAttempts} subscribe attempt(s) blocked
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Limit new signups
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Off by default for every tenant — a defensive lever for a signup spike/spam, not
              plan-tier-based.
            </p>
          </div>
          <Toggle
            checked={limits.signupLimitEnabled}
            onChange={(checked) => setLimits({ ...limits, signupLimitEnabled: checked })}
          />
        </div>
        {limits.signupLimitEnabled && (
          <div className="flex flex-col gap-1 sm:w-1/2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Max new signups / month
            </label>
            <input
              type="number"
              min={0}
              value={limits.maxSignupsPerMonth ?? ""}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxSignupsPerMonth: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="input"
            />
            {limits.blockedSignupAttempts > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {limits.blockedSignupAttempts} signup(s) blocked this month
              </p>
            )}
          </div>
        )}
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-fit">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
