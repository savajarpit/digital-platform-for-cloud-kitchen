"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import {
  ApiError,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  type SubscriptionSettings,
} from "@/lib/api/admin-subscriptions";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";

export function PlansPageSettingsCard({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSubscriptionSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSubscriptionSettings({
        homepageTitle: settings.homepageTitle || undefined,
        homepageDescription: settings.homepageDescription || undefined,
        plansPageTitle: settings.plansPageTitle || undefined,
        plansPageSubtitle: settings.plansPageSubtitle || undefined,
        whySubscribeEnabled: settings.whySubscribeEnabled,
        faqEnabled: settings.faqEnabled,
        contactCtaEnabled: settings.contactCtaEnabled,
        contactCtaTitle: settings.contactCtaTitle || undefined,
        contactCtaDescription: settings.contactCtaDescription || undefined,
        contactEmail: settings.contactEmail || undefined,
      });
      setSettings(updated);
      showToast("Plans page settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
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
