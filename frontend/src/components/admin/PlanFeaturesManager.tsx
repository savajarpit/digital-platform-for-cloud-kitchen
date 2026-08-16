"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  ApiError,
  createPlanFeature,
  deletePlanFeature,
  listPlanFeaturesAdmin,
  updatePlanFeature,
  type PlanFeature,
  type PlanFeatureInput,
} from "@/lib/api/admin-plan-content";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

const emptyForm: PlanFeatureInput = { icon: "💰", title: "", description: "", isEnabled: true };

export function PlanFeaturesManager({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [features, setFeatures] = useState<PlanFeature[] | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  useEffect(() => {
    listPlanFeaturesAdmin()
      .then(setFeatures)
      .catch(() => showToast("Couldn't load plan features.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refetch() {
    listPlanFeaturesAdmin().then(setFeatures).catch(() => {});
  }

  async function handleToggleEnabled(feature: PlanFeature) {
    try {
      await updatePlanFeature(feature.id, { isEnabled: !feature.isEnabled });
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update feature.", "error");
    }
  }

  function handleDelete(feature: PlanFeature) {
    confirm({
      message: `Delete the "${feature.title}" card?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlanFeature(feature.id);
          refetch();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete feature.", "error");
        }
      },
    });
  }

  if (!features) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            &quot;Why subscribe?&quot; cards
          </h3>
        </div>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add card
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Shown on the /plans page. Hidden entirely if there are none.
      </p>

      {editingId === "new" && (
        <PlanFeatureForm
          initial={emptyForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            await createPlanFeature(input);
            setEditingId(null);
            refetch();
          }}
        />
      )}

      {features.length === 0 && editingId !== "new" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No cards yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {features.map((feature) =>
          editingId === feature.id ? (
            <PlanFeatureForm
              key={feature.id}
              initial={{
                icon: feature.icon,
                title: feature.title,
                description: feature.description ?? "",
                isEnabled: feature.isEnabled,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                await updatePlanFeature(feature.id, input);
                setEditingId(null);
                refetch();
              }}
            />
          ) : (
            <div
              key={feature.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </p>
                  {feature.description && (
                    <p className="mt-0.5 min-w-0 wrap-break-word text-xs text-zinc-500 dark:text-zinc-400">
                      {feature.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Toggle checked={feature.isEnabled} onChange={() => handleToggleEnabled(feature)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(feature.id)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${feature.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(feature)}
                  disabled={!canEdit}
                  className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${feature.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function PlanFeatureForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlanFeatureInput;
  onCancel: () => void;
  onSave: (input: PlanFeatureInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Card saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save card.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900 dark:bg-primary-950/20"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[80px_1fr]">
        <input
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          placeholder="💰"
          required
          className="input w-full text-center text-lg"
        />
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Title (e.g. Save up to 30%)"
          required
          className="input w-full"
        />
      </div>
      <textarea
        value={form.description ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Description"
        rows={2}
        className="input w-full"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <Toggle
          checked={form.isEnabled ?? true}
          onChange={(v) => setForm((f) => ({ ...f, isEnabled: v }))}
        />
        Enabled
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
