"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  ApiError,
  createPlan,
  deletePlan,
  listPlansAdmin,
  publishPlan,
  type Plan,
} from "@/lib/api/admin-subscriptions";
import { listMeals } from "@/lib/api/admin-menu";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeclareDisruptionForm } from "@/components/admin/DeclareDisruptionForm";
import { PlanEditor } from "@/components/subscriptions-admin/PlanEditor";
import { PlanListSkeleton } from "@/components/subscriptions-admin/PlanListSkeleton";
import { PlanMetaForm } from "@/components/subscriptions-admin/PlanMetaForm";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { useState } from "react";

/** The Plans tab body. Search text, page and the create/edit toggles are owned
 * by the page (its header holds the search box and "New Plan" button). */
export function PlansTab({
  planSearch,
  page,
  onPageChange,
  creating,
  onCreatingChange,
  editingPlanId,
  onEditingPlanIdChange,
  canEdit,
}: {
  planSearch: string;
  page: number;
  onPageChange: (updater: (page: number) => number) => void;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  editingPlanId: string | null;
  onEditingPlanIdChange: (id: string | null) => void;
  canEdit: boolean;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [disruptionPlanId, setDisruptionPlanId] = useState<string | null>(null);
  const search = useDebouncedValue(planSearch, 250);

  // Paging/searching keeps the previous rows on screen until the next result
  // arrives, so the list never blanks out or remounts.
  const plansQuery = useQuery({
    queryKey: qk.admin("subscriptions", "plans", { page, search }),
    queryFn: () => listPlansAdmin({ page, search: search || undefined }),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const plans = plansQuery.data?.data;
  const meta = plansQuery.data?.meta ?? null;

  // Cached under the menu area so a meal edit elsewhere refreshes this picker.
  const mealsQuery = useQuery({
    queryKey: qk.admin("menu", "meals", "subscription-picker"),
    queryFn: () => listMeals({ limit: 100 }),
    staleTime: STALE.short,
  });
  const meals = mealsQuery.data?.data;

  const loadError = plansQuery.error ?? mealsQuery.error;
  const error = loadError
    ? loadError instanceof ApiError
      ? loadError.message
      : plansQuery.error
        ? "Couldn't load plans."
        : "Couldn't load meals."
    : null;

  function refetch() {
    void invalidateSubscriptionAreas(queryClient);
  }

  function handleDelete(plan: Plan) {
    confirm({
      message: `Delete "${plan.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlan(plan.id);
          refetch();
          showToast("Plan deleted", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete plan.", "error");
        }
      },
    });
  }

  async function handleTogglePublish(plan: Plan) {
    try {
      await publishPlan(plan.id, !plan.isPublished);
      refetch();
      showToast(`Plan ${!plan.isPublished ? "published" : "unpublished"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update plan.", "error");
    }
  }

  return (
    <>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {creating && (
        <PlanMetaForm
          initial={{
            name: "",
            durationDays: 7,
            priceInPaise: 0,
            features: [],
            isPopular: false,
            accentColor: "PRIMARY",
          }}
          onCancel={() => onCreatingChange(false)}
          onSave={async (input) => {
            const created = await createPlan(input);
            onCreatingChange(false);
            refetch();
            onEditingPlanIdChange(created.id);
          }}
        />
      )}

      {!plans ? (
        plansQuery.isError ? null : <PlanListSkeleton />
      ) : plans.length === 0 && !creating ? (
        <EmptyState
          compact
          title={search ? "No plans match your search." : "No curated plans yet."}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) =>
            editingPlanId === plan.id ? (
              <PlanEditor
                key={plan.id}
                planId={plan.id}
                meals={meals}
                canEdit={canEdit}
                onClose={() => onEditingPlanIdChange(null)}
              />
            ) : (
              <div key={plan.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/subscriptions/plans/${plan.id}`}
                        className="font-medium text-zinc-900 hover:text-primary-600 hover:underline dark:text-zinc-100"
                      >
                        {plan.name}
                      </Link>
                      <span
                        className={`badge ${
                          plan.isPublished
                            ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {plan.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {plan.durationDays} days · {formatPriceFromPaise(plan.priceInPaise)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={plan.isPublished}
                      onChange={() => handleTogglePublish(plan)}
                      disabled={!canEdit}
                    />
                    <button
                      type="button"
                      onClick={() => setDisruptionPlanId(disruptionPlanId === plan.id ? null : plan.id)}
                      disabled={!canEdit}
                      className="text-zinc-400 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Declare disruption for ${plan.name}`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditingPlanIdChange(plan.id)}
                      disabled={!canEdit}
                      className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Edit ${plan.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      disabled={!canEdit}
                      className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${plan.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {disruptionPlanId === plan.id && (
                  <DeclareDisruptionForm
                    scope="PLAN"
                    planId={plan.id}
                    startOpen
                    onDeclared={() => setDisruptionPlanId(null)}
                    onCancel={() => setDisruptionPlanId(null)}
                  />
                )}
              </div>
            ),
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} plans
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-outline btn-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-outline btn-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
