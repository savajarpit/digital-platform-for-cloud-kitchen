"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createPlatformPlan,
  deletePlatformPlan,
  listPlatformPlansAdmin,
  updatePlatformPlan,
  type PlatformPlan,
  type PlatformPlanInput,
} from "@/lib/api/admin-platform-plans";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlatformItemListSkeleton } from "@/components/admin/PlatformItemListSkeleton";
import { PlatformPlanForm } from "@/components/admin/PlatformPlanForm";
import { formatPriceFromPaise } from "@/lib/format/currency";

const emptyForm: PlatformPlanInput = {
  name: "",
  priceInPaise: 0,
  billingCycle: "MONTHLY",
  defaultMaxOrdersPerMonth: 0,
  defaultMaxSubscribers: 0,
  isPublished: false,
  sortOrder: 0,
};

export default function PlatformPlansAdminPage() {
  const queryClient = useQueryClient();
  // Same key CreateInviteForm reads, so editing a plan here refreshes it too.
  const listKey = qk.admin("platform", "plans");
  const { data: plans, error: queryError } = useQuery({
    queryKey: listKey,
    queryFn: listPlatformPlansAdmin,
    staleTime: STALE.short,
  });
  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Couldn't load plans."
    : null;
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Patch the cached list immediately, then refetch so it settles on the
  // server's truth.
  function patchPlans(fn: (prev: PlatformPlan[]) => PlatformPlan[]) {
    queryClient.setQueryData<PlatformPlan[]>(listKey, (prev) => (prev ? fn(prev) : prev));
    void queryClient.invalidateQueries({ queryKey: listKey });
  }

  function handleDelete(plan: PlatformPlan) {
    confirm({
      message: `Delete "${plan.name}"? Tenants already on this plan keep their current caps.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlatformPlan(plan.id);
          patchPlans((prev) => prev.filter((p) => p.id !== plan.id));
          showToast("Plan deleted", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete plan.", "error");
        }
      },
    });
  }

  async function handleTogglePublished(plan: PlatformPlan) {
    try {
      const updated = await updatePlatformPlan(plan.id, { ...plan, isPublished: !plan.isPublished });
      patchPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      showToast(`Plan ${updated.isPublished ? "published" : "unpublished"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update plan.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <Gauge className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Platform Plans
          </h2>
        </div>
        {editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Plan
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Your SaaS pricing tiers — order/subscriber caps here are the defaults; adjust a specific
        tenant&apos;s actual limits from their own tenant page.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!plans ? (
        error ? null : <PlatformItemListSkeleton />
      ) : (
        <div className="card flex flex-col gap-4 p-6">
          {editingId === "new" && (
            <PlatformPlanForm
              initial={emptyForm}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const created = await createPlatformPlan(input);
                patchPlans((prev) => [...prev, created]);
                setEditingId(null);
              }}
            />
          )}

          {plans.length === 0 && editingId !== "new" && (
            <EmptyState compact title="No plans yet." />
          )}

          <div className="flex flex-col gap-2">
            {plans.map((plan) =>
              editingId === plan.id ? (
                <PlatformPlanForm
                  key={plan.id}
                  initial={plan}
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    const updated = await updatePlatformPlan(plan.id, input);
                    patchPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
                    setEditingId(null);
                  }}
                />
              ) : (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
                >
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {plan.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatPriceFromPaise(plan.priceInPaise)}/{plan.billingCycle === "MONTHLY" ? "mo" : "yr"}{" "}
                      · {plan.defaultMaxOrdersPerMonth} orders · {plan.defaultMaxSubscribers} subscribers
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle checked={plan.isPublished} onChange={() => handleTogglePublished(plan)} />
                    <button
                      type="button"
                      onClick={() => setEditingId(plan.id)}
                      className="cursor-pointer text-zinc-400 hover:text-primary-600"
                      aria-label={`Edit ${plan.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      className="cursor-pointer text-zinc-400 hover:text-red-600"
                      aria-label={`Delete ${plan.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
