"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import {
  ApiError,
  getSubscriptionSettings,
  updateSubscriptionSettings,
} from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";

type ViewMode = "ACCORDION" | "CALENDAR" | "BOTH";

const OPTIONS: { value: ViewMode; label: string; description: string }[] = [
  { value: "CALENDAR", label: "Calendar", description: "A month grid; customers tap a date to see its meals." },
  { value: "ACCORDION", label: "List", description: "Stacked day cards, one per delivery day." },
  { value: "BOTH", label: "Both", description: "Customers switch between the calendar and the list." },
];

/** How a plan's menu is laid out on the storefront. Only shown to tenants
 * SUPER_ADMIN has granted the calendar plan view — everyone else keeps the list. */
export function PlanDisplaySettingsCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Same endpoint (and cache entry) as SubscriptionSettingsTab.
  const settingsKey = qk.admin("subscriptions", "settings");
  const { data } = useQuery({
    queryKey: settingsKey,
    queryFn: getSubscriptionSettings,
    staleTime: STALE.short,
  });
  const [choice, setChoice] = useState<ViewMode | null>(null);
  const [saving, setSaving] = useState(false);

  if (!data?.calendarViewGranted) return null;

  const saved: ViewMode = data.planViewMode ?? "ACCORDION";
  const value = choice ?? saved;

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSubscriptionSettings({ planViewMode: value });
      queryClient.setQueryData(settingsKey, updated);
      setChoice(null);
      void invalidateSubscriptionAreas(queryClient);
      showToast("Plan display saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save plan display.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Plan display</h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        How customers see a plan&apos;s day-by-day menu on your storefront.
      </p>

      {data.dateSelectionEnabled && (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
          Delivery date selection is on, so customers always get the calendar to pick their dates. List opens on the
          list with a Calendar tab; Both opens on the calendar with a List tab.
        </p>
      )}

      <div role="radiogroup" aria-label="Plan menu layout" className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canEdit}
              onClick={() => setChoice(opt.value)}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-primary-600 bg-primary-50 dark:bg-primary-950/40"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-primary-600" : "border-zinc-300 dark:border-zinc-600"
                }`}
                aria-hidden
              >
                {selected && <span className="h-2 w-2 rounded-full bg-primary-600" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{opt.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || value === saved}
          className="btn-primary btn-sm cursor-pointer self-start"
        >
          {saving ? "Saving…" : "Save display"}
        </button>
      )}
    </div>
  );
}
