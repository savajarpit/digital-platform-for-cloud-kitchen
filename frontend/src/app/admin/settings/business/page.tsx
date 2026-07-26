"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import {
  ApiError,
  getBusinessProfile,
  updateBusinessProfile,
  type BusinessProfile,
  type UpdateBusinessProfileInput,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";

type FormState = UpdateBusinessProfileInput;

export default function BusinessProfilePage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.BRANDING_EDIT);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBusinessProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          displayName: p.displayName,
          description: p.description ?? undefined,
          logoUrl: p.logoUrl ?? undefined,
          faviconUrl: p.faviconUrl ?? undefined,
          heroImageUrl: p.heroImageUrl ?? undefined,
          supportEmail: p.supportEmail ?? undefined,
          supportPhone: p.supportPhone ?? undefined,
          whatsappBusinessNumber: p.whatsappBusinessNumber ?? undefined,
          addressLine1: p.addressLine1 ?? undefined,
          addressLine2: p.addressLine2 ?? undefined,
          city: p.city ?? undefined,
          state: p.state ?? undefined,
          country: p.country ?? undefined,
          pincode: p.pincode ?? undefined,
          timezone: p.timezone,
          currency: p.currency,
          gstNumber: p.gstNumber ?? undefined,
          defaultLocale: p.defaultLocale,
          themeConfig: p.themeConfig,
        });
      })
      .catch(() => setError("Couldn't load business profile."));
  }, []);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function themeField(key: keyof NonNullable<FormState["themeConfig"]>, value: string) {
    setForm((prev) => (prev ? { ...prev, themeConfig: { ...prev.themeConfig, [key]: value } } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateBusinessProfile(form);
      setProfile(updated);
      showToast("Business profile saved", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !form) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Store className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Business Profile
        </h2>
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-70">
        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Basics</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Display name
            </label>
            <input
              type="text"
              value={form.displayName ?? ""}
              onChange={(e) => field("displayName", e.target.value)}
              required
              maxLength={120}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => field("description", e.target.value)}
              maxLength={500}
              rows={3}
              className="input w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Logo URL
              </label>
              <input
                type="url"
                value={form.logoUrl ?? ""}
                onChange={(e) => field("logoUrl", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Favicon URL
              </label>
              <input
                type="url"
                value={form.faviconUrl ?? ""}
                onChange={(e) => field("faviconUrl", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Hero image URL
              </label>
              <input
                type="url"
                value={form.heroImageUrl ?? ""}
                onChange={(e) => field("heroImageUrl", e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contact</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Support email
              </label>
              <input
                type="email"
                value={form.supportEmail ?? ""}
                onChange={(e) => field("supportEmail", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Support phone
              </label>
              <input
                type="tel"
                value={form.supportPhone ?? ""}
                onChange={(e) => field("supportPhone", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                WhatsApp business number
              </label>
              <input
                type="tel"
                value={form.whatsappBusinessNumber ?? ""}
                onChange={(e) => field("whatsappBusinessNumber", e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Address line 1
              </label>
              <input
                type="text"
                value={form.addressLine1 ?? ""}
                onChange={(e) => field("addressLine1", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Address line 2
              </label>
              <input
                type="text"
                value={form.addressLine2 ?? ""}
                onChange={(e) => field("addressLine2", e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                City
              </label>
              <input
                type="text"
                value={form.city ?? ""}
                onChange={(e) => field("city", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                State
              </label>
              <input
                type="text"
                value={form.state ?? ""}
                onChange={(e) => field("state", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Country
              </label>
              <input
                type="text"
                value={form.country ?? ""}
                onChange={(e) => field("country", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Pincode
              </label>
              <input
                type="text"
                value={form.pincode ?? ""}
                onChange={(e) => field("pincode", e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Locale & tax</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Timezone
              </label>
              <input
                type="text"
                value={form.timezone ?? ""}
                onChange={(e) => field("timezone", e.target.value)}
                placeholder="Asia/Kolkata"
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Currency
              </label>
              <input
                type="text"
                value={form.currency ?? ""}
                onChange={(e) => field("currency", e.target.value)}
                placeholder="INR"
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                GST number
              </label>
              <input
                type="text"
                value={form.gstNumber ?? ""}
                onChange={(e) => field("gstNumber", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Default locale
              </label>
              <input
                type="text"
                value={form.defaultLocale ?? ""}
                onChange={(e) => field("defaultLocale", e.target.value)}
                placeholder="en"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Theme colors</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                  {key.replace("Color", "")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.themeConfig?.[key] ?? "#16A34A"}
                    onChange={(e) => themeField(key, e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={form.themeConfig?.[key] ?? ""}
                    onChange={(e) => themeField(key, e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}
