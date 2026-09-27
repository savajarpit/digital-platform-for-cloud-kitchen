import type { MealSlotType } from "@/lib/api/subscriptions";

export const SLOT_ORDER: MealSlotType[] = ["BREAKFAST", "LUNCH", "DINNER"];

export const SLOT_LABELS: Record<MealSlotType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** One accent per meal slot: tenant brand ramps for lunch/dinner, amber for
 * breakfast. Full class names so Tailwind's scanner sees each of them. */
export const SLOT_DOT: Record<MealSlotType, string> = {
  BREAKFAST: "bg-amber-500",
  LUNCH: "bg-primary-600",
  DINNER: "bg-secondary-600",
};

/** Diagonal hatching for closed days — a background image, so it layers over any tint. */
export const HATCH_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 6px, rgba(113,113,122,0.2) 6px 7px)",
};
