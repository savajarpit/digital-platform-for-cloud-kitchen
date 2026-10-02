"use client";

import { useTranslations } from "next-intl";

/** Show the "only N left" nudge once stock drops to this many plates. */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Petpooja-style daily stock hint for today. Informational only: a meal
 * that's sold out today can still be ordered for a later date, and checkout
 * checks the stock for the date the customer actually picks.
 */
export function MealStockNote({
  remainingToday,
  className = "",
}: {
  remainingToday: number | null | undefined;
  className?: string;
}) {
  const t = useTranslations("menu");
  if (remainingToday == null || remainingToday > LOW_STOCK_THRESHOLD)
    return null;

  const soldOut = remainingToday === 0;
  return (
    <p
      className={`text-xs font-semibold ${
        soldOut
          ? "text-red-600 dark:text-red-400"
          : "text-amber-600 dark:text-amber-400"
      } ${className}`}
    >
      {soldOut
        ? t("soldOutToday")
        : t("onlyLeftToday", { count: remainingToday })}
    </p>
  );
}
