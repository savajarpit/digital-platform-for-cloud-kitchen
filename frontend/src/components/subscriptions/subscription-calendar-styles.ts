import type { SubscriptionDayKind } from "@/lib/api/subscriptions";

export const STATUS_LABELS: Record<SubscriptionDayKind, string> = {
  DELIVERED: "Delivered",
  UPCOMING: "Upcoming",
  SKIPPED: "Skipped",
  DISRUPTED: "Disrupted",
  HOLIDAY: "Holiday",
  OFF_DAY: "No delivery",
  NOT_SCHEDULED: "Not scheduled",
  PROJECTED: "Added for holiday",
};

export const STATUS_TONE: Record<SubscriptionDayKind, string> = {
  DELIVERED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  UPCOMING:
    "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
  SKIPPED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  DISRUPTED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  HOLIDAY:
    "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
  OFF_DAY:
    "border-transparent bg-zinc-100 text-zinc-400 dark:bg-zinc-800/70 dark:text-zinc-600",
  NOT_SCHEDULED:
    "border-dashed border-zinc-100 bg-transparent text-zinc-300 dark:border-zinc-800 dark:text-zinc-700",
  PROJECTED:
    "border-dashed border-primary-300 bg-primary-50/40 text-zinc-900 dark:border-primary-800 dark:bg-primary-950/20 dark:text-zinc-100",
};

export const STATUS_BADGE: Record<SubscriptionDayKind, string> = {
  DELIVERED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  UPCOMING:
    "bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400",
  SKIPPED:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  DISRUPTED: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400",
  HOLIDAY: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  OFF_DAY: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  NOT_SCHEDULED:
    "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600",
  PROJECTED:
    "bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400",
};

/** Diagonal hatching for holidays — layers over any tint. */
export const HATCH_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 6px, rgba(113,113,122,0.2) 6px 7px)",
};
