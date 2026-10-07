"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
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
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlansPageSettingsCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Same endpoint (and cache entry) as SubscriptionSettingsTab, so opening
  // either tab first makes the other instant.
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
      // null, not undefined — an emptied field must clear back to the default.
      const updated = await updateSubscriptionSettings({
        homepageTitle: settings.homepageTitle?.trim() || null,
        homepageDescription: settings.homepageDescription?.trim() || null,
        plansPageTitle: settings.plansPageTitle?.trim() || null,
        plansPageSubtitle: settings.plansPageSubtitle?.trim() || null,
        whySubscribeEnabled: settings.whySubscribeEnabled,
        faqEnabled: settings.faqEnabled,
        contactCtaEnabled: settings.contactCtaEnabled,
        contactCtaTitle: settings.contactCtaTitle?.trim() || null,
        contactCtaDescription: settings.contactCtaDescription?.trim() || null,
        contactEmail: settings.contactEmail?.trim() || null,
      });
      queryClient.setQueryData(settingsKey, updated);
      setSettings(null);
      void invalidateSubscriptionAreas(queryClient);
      showToast("Plans page settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    if (isError) return <EmptyState compact title="Couldn't load plans page settings." />;
    // Same card shell and section rhythm as the form below: heading, three
    // bordered sections of inputs/toggles, then the save button.
    return (
      <div className="card flex flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-5 w-64" />
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-10.5 w-full rounded-xl" />
            <Skeleton className="h-10.5 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10.5 w-full rounded-xl" />
          <Skeleton className="h-18 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-primary-600">
        <FileText className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          plans page &amp; home &quot;Meal Plans&quot; copy
        </h3>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4 disabled:opacity-70">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
            Home page &quot;Meal Plans&quot; block
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={settings.homepageTitle ?? ""}
              onChange={(e) => setSettings({ ...settings, homepageTitle: e.target.value })}
              placeholder="Block title (e.g. Meal Plans)"
              className="input w-full"
            />
            <input
              value={settings.homepageDescription ?? ""}
              onChange={(e) => setSettings({ ...settings, homepageDescription: e.target.value })}
              placeholder="Block description"
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
            plans page header
          </p>
          <input
            value={settings.plansPageTitle ?? ""}
            onChange={(e) => setSettings({ ...settings, plansPageTitle: e.target.value })}
            placeholder="Page title (e.g. Choose Your Plan)"
            className="input w-full"
          />
          <textarea
            value={settings.plansPageSubtitle ?? ""}
            onChange={(e) => setSettings({ ...settings, plansPageSubtitle: e.target.value })}
            placeholder="Page subtitle"
            rows={2}
            className="input w-full"
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              &quot;Why subscribe?&quot; section
            </span>
            <Toggle
              checked={settings.whySubscribeEnabled}
              onChange={(checked) => setSettings({ ...settings, whySubscribeEnabled: checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              FAQ section
            </span>
            <Toggle
              checked={settings.faqEnabled}
              onChange={(checked) => setSettings({ ...settings, faqEnabled: checked })}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              &quot;Still have questions?&quot; CTA
            </span>
            <Toggle
              checked={settings.contactCtaEnabled}
              onChange={(checked) => setSettings({ ...settings, contactCtaEnabled: checked })}
            />
          </label>
          {settings.contactCtaEnabled && (
            <>
              <input
                value={settings.contactCtaTitle ?? ""}
                onChange={(e) => setSettings({ ...settings, contactCtaTitle: e.target.value })}
                placeholder="CTA title"
                className="input w-full"
              />
              <textarea
                value={settings.contactCtaDescription ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, contactCtaDescription: e.target.value })
                }
                placeholder="CTA description"
                rows={2}
                className="input w-full"
              />
              <input
                value={settings.contactEmail ?? ""}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                placeholder="Contact email (defaults to your support email)"
                className="input w-full"
              />
            </>
          )}
        </div>

        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary btn-sm self-start">
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </fieldset>
    </form>
  );
}
