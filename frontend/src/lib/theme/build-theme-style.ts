import { generateColorScale } from "./generate-color-scale";
import type { ThemeConfig } from "@/lib/api/settings";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const FALLBACK_COLORS = {
  primaryColor: "#16A34A",
  secondaryColor: "#0EA5E9",
  accentColor: "#F59E0B",
} as const;

function safeHex(value: string | undefined, fallback: string): string {
  return value && HEX_PATTERN.test(value) ? value : fallback;
}

/**
 * Builds a CSS custom-properties block for the tenant's brand colors, to be
 * injected server-side into <head> so there is never a flash of the wrong
 * (or default) brand before client JS runs.
 */
export function buildThemeStyle(themeConfig: ThemeConfig): string {
  const primary = generateColorScale(
    safeHex(themeConfig.primaryColor, FALLBACK_COLORS.primaryColor),
  );
  const secondary = generateColorScale(
    safeHex(themeConfig.secondaryColor, FALLBACK_COLORS.secondaryColor),
  );
  const accent = generateColorScale(
    safeHex(themeConfig.accentColor, FALLBACK_COLORS.accentColor),
  );

  const declarations = (prefix: string, scale: Record<string, string>) =>
    Object.entries(scale)
      .map(([shade, value]) => `--brand-${prefix}-${shade}: ${value};`)
      .join("\n");

  // `html:root` (specificity 0,1,1) deterministically beats the plain
  // `:root` (0,1,0) fallback declared in globals.css, regardless of where
  // in <head> this injected block ends up relative to the compiled
  // stylesheet — no reliance on source order.
  return `html:root {\n${declarations("primary", primary)}\n${declarations("secondary", secondary)}\n${declarations("accent", accent)}\n}`;
}
