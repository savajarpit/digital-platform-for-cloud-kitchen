"use client";

import type { BrandDisplayMode, UpdateBusinessProfileInput } from "@/lib/api/admin-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ImageUploadInput } from "@/components/admin/ImageUploadInput";
import { BrandLockup } from "@/components/layout/BrandLockup";

const MODE_LABELS: Record<BrandDisplayMode, string> = {
  LOGO: "Logo only",
  NAME: "Name only",
  BOTH: "Logo + name",
};

const OG_MIN_WIDTH = 1200;
const OG_MIN_HEIGHT = 630;

type FormState = UpdateBusinessProfileInput;

export function BrandingDisplayCard({
  form,
  field,
  canEdit,
}: {
  form: FormState;
  field: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  canEdit: boolean;
}) {
  function handleOgImageChange(url: string | undefined) {
    field("ogImageUrl", url ?? "");
    if (!url) {
      field("ogImageWidth", undefined);
      field("ogImageHeight", undefined);
      return;
    }
    const img = new Image();
    img.onload = () => {
      field("ogImageWidth", img.naturalWidth);
      field("ogImageHeight", img.naturalHeight);
    };
    img.src = url;
  }

  const ogTooSmall =
    !!form.ogImageWidth &&
    !!form.ogImageHeight &&
    (form.ogImageWidth < OG_MIN_WIDTH || form.ogImageHeight < OG_MIN_HEIGHT);

  return (
    <div className="card flex flex-col gap-6 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Header, footer & social share
      </h3>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <BrandPlacementFields
          title="Header"
          mode={form.headerDisplayMode ?? "BOTH"}
          onModeChange={(v) => field("headerDisplayMode", v)}
          heightPx={form.headerLogoHeightPx ?? 36}
          onHeightChange={(v) => field("headerLogoHeightPx", v)}
          widthPx={form.headerLogoWidthPx ?? undefined}
          onWidthChange={(v) => field("headerLogoWidthPx", v)}
          disabled={!canEdit}
        />
        <BrandPlacementFields
          title="Footer"
          mode={form.footerDisplayMode ?? "BOTH"}
          onModeChange={(v) => field("footerDisplayMode", v)}
          heightPx={form.footerLogoHeightPx ?? 36}
          onHeightChange={(v) => field("footerLogoHeightPx", v)}
          widthPx={form.footerLogoWidthPx ?? undefined}
          onWidthChange={(v) => field("footerLogoWidthPx", v)}
          disabled={!canEdit}
        />
      </div>

      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">Live preview</p>
        <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <BrandLockup
              mode={form.headerDisplayMode ?? "BOTH"}
              logoUrl={form.logoUrl ?? undefined}
              displayName={form.displayName || "Your Kitchen"}
              heightPx={form.headerLogoHeightPx ?? 36}
              widthPx={form.headerLogoWidthPx ?? undefined}
              variant="header"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto bg-zinc-900 px-4 py-3">
            <BrandLockup
              mode={form.footerDisplayMode ?? "BOTH"}
              logoUrl={form.logoUrl ?? undefined}
              displayName={form.displayName || "Your Kitchen"}
              heightPx={form.footerLogoHeightPx ?? 36}
              widthPx={form.footerLogoWidthPx ?? undefined}
              variant="footer"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ImageUploadInput
              label="Social share image (OG)"
              value={form.ogImageUrl ?? undefined}
              onChange={handleOgImageChange}
              disabled={!canEdit}
              previewClassName="h-16 w-28 rounded-lg"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Recommended size: 1200×630px. Shown when your site is shared on WhatsApp, LinkedIn,
              Slack, etc. Falls back to your logo/hero image if not set.
            </p>
            {ogTooSmall && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                This image is {form.ogImageWidth}×{form.ogImageHeight}px — below the recommended
                1200×630px. It will still work, but may look small on some platforms.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Alt text for share image
            </label>
            <input
              type="text"
              value={form.ogImageAlt ?? ""}
              onChange={(e) => field("ogImageAlt", e.target.value)}
              disabled={!canEdit}
              maxLength={150}
              placeholder={form.displayName || "Your Kitchen"}
              className="input w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPlacementFields({
  title,
  mode,
  onModeChange,
  heightPx,
  onHeightChange,
  widthPx,
  onWidthChange,
  disabled,
}: {
  title: string;
  mode: BrandDisplayMode;
  onModeChange: (mode: BrandDisplayMode) => void;
  heightPx: number;
  onHeightChange: (px: number) => void;
  widthPx: number | undefined;
  onWidthChange: (px: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{title}</h4>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Show
        </label>
        <Select
          value={mode}
          onValueChange={(v) => onModeChange(v as BrandDisplayMode)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODE_LABELS) as BrandDisplayMode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MODE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Logo height (px)
          </label>
          <input
            type="number"
            min={24}
            max={80}
            value={heightPx}
            onChange={(e) => onHeightChange(Number(e.target.value) || 36)}
            disabled={disabled}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Logo width (px)
          </label>
          <input
            type="number"
            min={0}
            max={320}
            placeholder="Auto"
            value={widthPx ?? ""}
            onChange={(e) => onWidthChange(e.target.value === "" ? 0 : Number(e.target.value))}
            disabled={disabled}
            className="input w-full"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-400">Leave width blank for auto (never crops the logo).</p>
    </div>
  );
}
