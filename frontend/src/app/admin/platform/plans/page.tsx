"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
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
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    listPlatformPlansAdmin()
      .then(setPlans)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load plans."),
      );
  }, []);

  function handleDelete(plan: PlatformPlan) {
    confirm({
      message: `Delete "${plan.name}"? Tenants already on this plan keep their current caps.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlatformPlan(plan.id);
          setPlans((prev) => prev?.filter((p) => p.id !== plan.id) ?? null);
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete plan.", "error");
        }
      },
    });
  }

  async function handleTogglePublished(plan: PlatformPlan) {
    try {
      const updated = await updatePlatformPlan(plan.id, { ...plan, isPublished: !plan.isPublished });
      setPlans((prev) => prev?.map((p) => (p.id === plan.id ? updated : p)) ?? null);
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
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <div className="card flex flex-col gap-4 p-6">
          {editingId === "new" && (
            <PlatformPlanForm
              initial={emptyForm}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const created = await createPlatformPlan(input);
                setPlans((prev) => [...(prev ?? []), created]);
                setEditingId(null);
              }}
            />
          )}

          {plans.length === 0 && editingId !== "new" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No plans yet.</p>
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
                    setPlans((prev) => prev?.map((p) => (p.id === plan.id ? updated : p)) ?? null);
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
