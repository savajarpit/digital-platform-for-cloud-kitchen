/** Shared `.badge` color classes so order/subscription status pills look
 * identical wherever they appear — list rows and detail page headers alike. */

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  CONFIRMED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PREPARING: "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  OUT_FOR_DELIVERY: "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400",
  DELIVERED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};
