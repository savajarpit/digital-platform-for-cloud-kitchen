"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import {
  ApiError,
  getHomePageContent,
  updateHomePageContent,
  type UpdateHomePageContentInput,
} from "@/lib/api/admin-home-content";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { HeroImagesInput } from "@/components/admin/HeroImagesInput";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";

type FormState = {
  heroTagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrls: string[];
  reviewsSectionTitle: string;
  reviewsSectionDescription: string;
  ctaEnabled: boolean;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
};

export function HomePageContentEditor({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHomePageContent()
      .then((content) =>
        setForm({
          heroTagline: content?.heroTagline ?? "",
          heroTitle: content?.heroTitle ?? "",
          heroSubtitle: content?.heroSubtitle ?? "",
          heroImageUrls: content?.heroImageUrls ?? [],
          reviewsSectionTitle: content?.reviewsSectionTitle ?? "",
          reviewsSectionDescription: content?.reviewsSectionDescription ?? "",
          ctaEnabled: content?.ctaEnabled ?? true,
          ctaTitle: content?.ctaTitle ?? "",
          ctaDescription: content?.ctaDescription ?? "",
          ctaPrimaryLabel: content?.ctaPrimaryLabel ?? "",
          ctaPrimaryLink: content?.ctaPrimaryLink ?? "",
          ctaSecondaryLabel: content?.ctaSecondaryLabel ?? "",
          ctaSecondaryLink: content?.ctaSecondaryLink ?? "",
        }),
      )
      .catch(() => showToast("Couldn't load home page content.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const input: UpdateHomePageContentInput = {
        heroTagline: form.heroTagline || undefined,
        heroTitle: form.heroTitle || undefined,
        heroSubtitle: form.heroSubtitle || undefined,
        heroImageUrls: form.heroImageUrls,
        reviewsSectionTitle: form.reviewsSectionTitle || undefined,
        reviewsSectionDescription: form.reviewsSectionDescription || undefined,
        ctaEnabled: form.ctaEnabled,
        ctaTitle: form.ctaTitle || undefined,
        ctaDescription: form.ctaDescription || undefined,
        ctaPrimaryLabel: form.ctaPrimaryLabel || undefined,
        ctaPrimaryLink: form.ctaPrimaryLink || undefined,
        ctaSecondaryLabel: form.ctaSecondaryLabel || undefined,
        ctaSecondaryLink: form.ctaSecondaryLink || undefined,
      };
      await updateHomePageContent(input);
      showToast("Home page content saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-primary-600">
        <ImageIcon className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Hero, Reviews &amp; CTA
        </h3>
      </div>

      {!canEdit && <ViewOnlyNotice />}

      <fieldset disabled={!canEdit} className="flex flex-col gap-4 disabled:opacity-70">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">Hero</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.heroTagline}
              onChange={(e) => setForm({ ...form, heroTagline: e.target.value })}
              placeholder="Tagline badge (e.g. Fresh & healthy)"
              className="input w-full"
            />
            <input
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              placeholder="Headline (defaults to your business name)"
              className="input w-full"
            />
          </div>
          <textarea
            value={form.heroSubtitle}
            onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
            placeholder="Subheading"
            rows={2}
            className="input w-full"
          />
          <HeroImagesInput
            value={form.heroImageUrls}
            onChange={(urls) => setForm({ ...form, heroImageUrls: urls })}
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
            Reviews section
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.reviewsSectionTitle}
              onChange={(e) => setForm({ ...form, reviewsSectionTitle: e.target.value })}
              placeholder="Section title (e.g. What our customers say)"
              className="input w-full"
            />
            <input
              value={form.reviewsSectionDescription}
              onChange={(e) => setForm({ ...form, reviewsSectionDescription: e.target.value })}
              placeholder="Section description"
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
              &quot;Start eating better&quot; CTA
            </p>
            <Toggle
              checked={form.ctaEnabled}
              onChange={(checked) => setForm({ ...form, ctaEnabled: checked })}
            />
          </div>
          {form.ctaEnabled && (
            <>
              <input
                value={form.ctaTitle}
                onChange={(e) => setForm({ ...form, ctaTitle: e.target.value })}
                placeholder="CTA title"
                className="input w-full"
              />
              <textarea
                value={form.ctaDescription}
                onChange={(e) => setForm({ ...form, ctaDescription: e.target.value })}
                placeholder="CTA description"
                rows={2}
                className="input w-full"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={form.ctaPrimaryLabel}
                  onChange={(e) => setForm({ ...form, ctaPrimaryLabel: e.target.value })}
                  placeholder="Primary button label"
                  className="input w-full"
                />
                <input
                  value={form.ctaPrimaryLink}
                  onChange={(e) => setForm({ ...form, ctaPrimaryLink: e.target.value })}
                  placeholder="Primary button link (e.g. /plans)"
                  className="input w-full"
                />
                <input
                  value={form.ctaSecondaryLabel}
                  onChange={(e) => setForm({ ...form, ctaSecondaryLabel: e.target.value })}
                  placeholder="Secondary button label"
                  className="input w-full"
                />
                <input
                  value={form.ctaSecondaryLink}
                  onChange={(e) => setForm({ ...form, ctaSecondaryLink: e.target.value })}
                  placeholder="Secondary button link (e.g. /menu)"
                  className="input w-full"
                />
              </div>
            </>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}
