import { Leaf } from "lucide-react";
import type { BrandDisplayMode } from "@/lib/api/settings";

/**
 * Single source of truth for "given a display mode + logo + name + size,
 * render this" — used by Header, Footer, and the admin branding preview so
 * the preview can never drift from what's actually live.
 */
export function BrandLockup({
  mode,
  logoUrl,
  displayName,
  heightPx,
  widthPx,
  variant,
}: {
  mode: BrandDisplayMode;
  logoUrl?: string;
  displayName: string;
  heightPx: number;
  widthPx?: number;
  variant: "header" | "footer";
}) {
  // Logo-only but no logo uploaded — an empty brand slot is a worse failure
  // than showing the name, so fall back to NAME instead.
  const effectiveMode = mode === "LOGO" && !logoUrl ? "NAME" : mode;

  if (effectiveMode === "NAME") {
    return (
      <span
        className={
          variant === "header"
            ? "truncate font-display text-lg font-bold text-zinc-900 sm:text-xl dark:text-zinc-100"
            : "font-display text-lg font-bold text-white"
        }
      >
        {displayName}
      </span>
    );
  }

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={displayName}
      className="shrink-0 object-contain"
      style={{ height: heightPx, width: widthPx ?? "auto" }}
    />
  ) : (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-primary-600 ${
        variant === "header" ? "shadow-glow transition-transform group-hover:scale-110" : ""
      }`}
      style={{ height: heightPx, width: heightPx }}
    >
      <Leaf className="h-1/2 w-1/2 text-white" />
    </div>
  );

  if (effectiveMode === "LOGO") {
    return logo;
  }

  return (
    <>
      {logo}
      <span
        className={
          variant === "header"
            ? "truncate font-display text-lg font-bold text-zinc-900 sm:text-xl dark:text-zinc-100"
            : "font-display text-lg font-bold text-white"
        }
      >
        {displayName}
      </span>
    </>
  );
}
