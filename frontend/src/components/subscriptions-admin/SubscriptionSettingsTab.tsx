"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  type SubscriptionSettings,
} from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toggle } from "@/components/ui/Toggle";

export function SubscriptionSettingsTab({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const settingsKey = qk.admin("subscriptions", "settings");
  const { data, isError } = useQuery({
    queryKey: settingsKey,
    queryFn: getSubscriptionSettings,
    staleTime: STALE.short,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const [draft, setSettings] = useState<SubscriptionSettings | null>(null);
  const settings = draft ?? data ?? null;
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSubscriptionSettings(settings);
      queryClient.setQueryData(settingsKey, updated);
      setSettings(null);
      void invalidateSubscriptionAreas(queryClient);
      showToast("Settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    if (isError) return <EmptyState compact title="Couldn't load subscription settings." />;
    return (
      <div className="card flex max-w-lg flex-col gap-4 p-6" aria-busy="true">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
        </div>
        {[40, 32].map((w) => (
          <div key={w} className="flex items-center justify-between gap-3">
            <Skeleton className={`h-5 ${w === 40 ? "w-52" : "w-44"}`} />
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          </div>
        ))}
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-[42px] w-32 rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="card flex max-w-lg flex-col gap-4 p-6">
      <label className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Show plans page to customers
          <span className="block text-xs font-normal text-zinc-400">
            Off hides /plans everywhere — nav, footer, home page — and blocks direct links to it.
            Customers with an existing subscription can still manage it from &quot;My
            Subscriptions&quot;.
          </span>
        </span>
        <Toggle
          checked={settings.isEnabled}
          onChange={(checked) => setSettings({ ...settings, isEnabled: checked })}
          disabled={!canEdit}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Accepting new subscriptions
        </span>
        <Toggle
          checked={settings.isAcceptingNewSubscriptions}
          onChange={(checked) => setSettings({ ...settings, isAcceptingNewSubscriptions: checked })}
          disabled={!canEdit}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Show plans on home page
          <span className="block text-xs font-normal text-zinc-400">
            Only appears if at least one plan is also published.
          </span>
        </span>
        <Toggle
          checked={settings.showOnHomepage}
          onChange={(checked) => setSettings({ ...settings, showOnHomepage: checked })}
          disabled={!canEdit}
        />
      </label>
      {!settings.isAcceptingNewSubscriptions && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Message shown to customers (optional)
          </label>
          <input
            value={settings.closureReason ?? ""}
            onChange={(e) => setSettings({ ...settings, closureReason: e.target.value })}
            placeholder="Kitchen at capacity — back Monday"
            disabled={!canEdit}
            className="input"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Minimum notice for changes (hours)
        </label>
        <input
          type="number"
          min={0}
          max={240}
          value={settings.noticeHoursBeforeDelivery}
          onChange={(e) =>
            setSettings({ ...settings, noticeHoursBeforeDelivery: Number(e.target.value) })
          }
          disabled={!canEdit}
          className="input w-32"
        />
        <p className="text-xs text-zinc-400">
          How far ahead a customer must skip/pause/change delivery for an already-active subscription.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          First delivery lead time (days)
        </label>
        <input
          type="number"
          min={0}
          max={14}
          value={settings.startDateLeadDays}
          onChange={(e) => setSettings({ ...settings, startDateLeadDays: Number(e.target.value) })}
          disabled={!canEdit}
          className="input w-32"
        />
        <p className="text-xs text-zinc-400">
          Days before a new subscriber&apos;s first delivery — 0 for same-day (delivered right after payment
          instead of waiting for tonight&apos;s prep run).
        </p>
      </div>
      {canEdit && (
        <button type="submit" disabled={saving} className="btn-primary btn-sm self-start">
          {saving ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}
