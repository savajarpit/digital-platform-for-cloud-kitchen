"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { ApiError, uploadImage } from "@/lib/api/uploads";
import { useToast } from "@/context/ToastContext";

const MAX_IMAGES = 10;

/** A gallery uploader — unlike ImageUploadInput (single, replace-in-place),
 * this appends to a list, up to MAX_IMAGES, each removable independently.
 * Used for the meal detail page's photo gallery, additive to the single
 * imageUrl thumbnail used everywhere else (card, cart, order history). */
export function MultiImageUploadInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - value.length;
    if (remaining <= 0) {
      showToast(`You can add up to ${MAX_IMAGES} images.`, "error");
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded = await Promise.all(toUpload.map((file) => uploadImage(file)));
      onChange([...value, ...uploaded.map((u) => u.url)]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't upload one or more images.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div
            key={url + i}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled}
              className="absolute top-0.5 right-0.5 cursor-pointer rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              aria-label={`Remove image ${i + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-600"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[10px]">{uploading ? "Uploading…" : "Add"}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400">
        JPG, PNG, WebP or GIF — up to 5MB each, {MAX_IMAGES} images max.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
