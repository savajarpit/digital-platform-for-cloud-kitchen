"use client";

import { useRef, useState } from "react";
import { ImageOff, Upload, X } from "lucide-react";
import { ApiError, uploadImage } from "@/lib/api/uploads";
import { useToast } from "@/context/ToastContext";

export function ImageUploadInput({
  label,
  value,
  onChange,
  disabled,
  previewClassName = "h-20 w-20 rounded-lg",
}: {
  label: string;
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  previewClassName?: string;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't upload image.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 ${previewClassName}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageOff className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="btn-outline btn-sm cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : value ? "Change" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                disabled={disabled || uploading}
                className="btn-ghost btn-sm cursor-pointer text-red-600 hover:text-red-700"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400">JPG, PNG, WebP or GIF — up to 5MB.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
