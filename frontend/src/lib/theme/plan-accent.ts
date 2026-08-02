import type { PlanAccentColor } from "@/lib/api/plans";

/**
 * Maps a plan's accentColor to real, literal Tailwind classes — never
 * interpolated (`` `from-${color}-400` ``), since Tailwind's JIT scanner
 * only picks up class names that appear as complete strings in source.
 * Using the tenant's own primary/secondary/accent ramps (never a raw hex)
 * means a brand-color change in Settings reskins every plan card instantly,
 * same rule as every other component in this frontend.
 */
export const PLAN_ACCENT_GRADIENT: Record<PlanAccentColor, string> = {
  PRIMARY: "from-primary-400 to-primary-600",
  SECONDARY: "from-secondary-400 to-secondary-600",
  ACCENT: "from-accent-400 to-accent-600",
};

export const PLAN_ACCENT_BADGE: Record<PlanAccentColor, string> = {
  PRIMARY: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  SECONDARY: "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  ACCENT: "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400",
};

export const PLAN_ACCENT_ICON_BG: Record<PlanAccentColor, string> = {
  PRIMARY: "bg-primary-50 dark:bg-primary-950",
  SECONDARY: "bg-secondary-50 dark:bg-secondary-950",
  ACCENT: "bg-accent-50 dark:bg-accent-950",
};

export const PLAN_ACCENT_ICON_TEXT: Record<PlanAccentColor, string> = {
  PRIMARY: "text-primary-600 dark:text-primary-400",
  SECONDARY: "text-secondary-600 dark:text-secondary-400",
  ACCENT: "text-accent-600 dark:text-accent-400",
};
