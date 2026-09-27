"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import {
  ApiError,
  getSubscriptionSettings,
  updateSubscriptionSettings,
} from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";

interface Draft {
  dateSelectionEnabled: boolean;
  selectionFlexibilityDays: number;
  allowDateChangeAfterPurchase: boolean;
}

/** Lets customers pick their own delivery dates before checkout, and
 * (separately) move an already-purchased delivery to another date. Only
 * shown to tenants SUPER_ADMIN has granted delivery date selection — off
 * without it, same as PlanDisplaySettingsCard's own calendar-view gate. */
export function DeliveryDateSelectionCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Same endpoint (and cache entry) as SubscriptionSettingsTab/PlanDisplaySettingsCard.
  const settingsKey = qk.admin("subscriptions", "settings");
  const { data } = useQuery({
    queryKey: settingsKey,
    queryFn: getSubscriptionSettings,
    staleTime: STALE.short,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  if (!data?.dateSelectionGranted) return null;

  const saved: Draft = {
    dateSelectionEnabled: data.dateSelectionEnabled ?? false,
    selectionFlexibilityDays: data.selectionFlexibilityDays ?? 7,
    allowDateChangeAfterPurchase: data.allowDateChangeAfterPurchase ?? false,
  };
  const value = draft ?? saved;
  const dirty =
    value.dateSelectionEnabled !== saved.dateSelectionEnabled ||
    value.selectionFlexibilityDays !== saved.selectionFlexibilityDays ||
    value.allowDateChangeAfterPurchase !== saved.allowDateChangeAfterPurchase;

  function patch(next: Partial<Draft>) {
    setDraft({ ...value, ...next });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSubscriptionSettings(value);
      queryClient.setQueryData(settingsKey, updated);
      setDraft(null);
      void invalidateSubscriptionAreas(queryClient);
      showToast("Delivery date selection saved", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Couldn't save delivery date selection.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Delivery date selection
        </h3>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Let customers choose their delivery dates
          <span className="block text-xs font-normal text-zinc-400">
            The next valid days are pre-selected at checkout — customers can
            swap them for any other day inside the window.
          </span>
        </span>
        <Toggle
          checked={value.dateSelectionEnabled}
          onChange={(checked) => patch({ dateSelectionEnabled: checked })}
          disabled={!canEdit}
        />
      </label>

      {value.dateSelectionEnabled && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Flexibility days (extra delivery days to choose from)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={value.selectionFlexibilityDays}
            onChange={(e) =>
              patch({ selectionFlexibilityDays: Number(e.target.value) })
            }
            disabled={!canEdit}
            className="input w-32"
          />
          <p className="text-xs text-zinc-400">
            Default is 7. With 5, customers of a 7-day plan pick 7 out of 12
            available delivery days. Holidays and off-days don&apos;t count
            towards these.
          </p>
        </div>
      )}

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Allow customers to change dates after purchase
          <span className="block text-xs font-normal text-zinc-400">
            Lets subscribers move an upcoming delivery to another date. Skip and
            address changes stay available either way.
          </span>
        </span>
        <Toggle
          checked={value.allowDateChangeAfterPurchase}
          onChange={(checked) =>
            patch({ allowDateChangeAfterPurchase: checked })
          }
          disabled={!canEdit}
        />
      </label>

      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary btn-sm cursor-pointer self-start"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
