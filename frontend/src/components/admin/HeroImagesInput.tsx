"use client";

import { ImageUploadInput } from "@/components/admin/ImageUploadInput";

const SLOT_LABELS = ["Hero image 1", "Hero image 2", "Hero image 3", "Hero image 4"];

export function HeroImagesInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  function setSlot(index: number, url: string | undefined) {
    const next = [...value];
    if (url) {
      next[index] = url;
    } else {
      next.splice(index, 1);
    }
    onChange(next.filter(Boolean));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Hero images (up to 4)
      </label>
      <p className="mb-1 text-xs text-zinc-400">
        Shown as a collage on desktop. Leave empty to hide the collage entirely.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SLOT_LABELS.map((label, i) => (
          <ImageUploadInput
            key={i}
            label={label}
            value={value[i]}
            onChange={(url) => setSlot(i, url)}
            disabled={disabled}
            previewClassName="h-16 w-16 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
