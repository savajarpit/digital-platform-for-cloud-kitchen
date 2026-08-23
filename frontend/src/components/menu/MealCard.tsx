"use client";

import { useTranslations } from "next-intl";
import { ImageOff, Star } from "lucide-react";
import type { Meal } from "@/lib/api/menu";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatMealWeight } from "@/lib/format/weight";
import { AddToCartButton } from "./AddToCartButton";

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;
const MACRO_LABELS: Record<(typeof MACRO_KEYS)[number], string> = {
  calories: "Cal",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

function macroValue(nutrition: Record<string, unknown>, key: string): string | null {
  const value = nutrition[key];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

export function MealCard({
  meal,
  currency,
  index = 0,
}: {
  meal: Meal;
  currency: string;
  index?: number;
}) {
  const t = useTranslations("menu");
  const macros = MACRO_KEYS.map((key) => ({
    key,
    label: MACRO_LABELS[key],
    value: macroValue(meal.nutrition, key),
  })).filter((m) => m.value !== null);

  const discountPercentage = meal.activePromotion?.discountPercentage ?? 0;
  const discountedPriceInPaise =
    discountPercentage > 0
      ? meal.priceInPaise - Math.floor((meal.priceInPaise * discountPercentage) / 100)
      : meal.priceInPaise;

  return (
    <article
      className="card card-hover flex flex-col overflow-hidden opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-800">
        {meal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
            <ImageOff className="h-10 w-10" strokeWidth={1.5} />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 bg-white ${
            meal.isVegetarian ? "border-green-600" : "border-red-600"
          }`}
          aria-label={meal.isVegetarian ? "Vegetarian" : "Non-vegetarian"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meal.isVegetarian ? "bg-green-600" : "bg-red-600"}`} />
        </span>
        {meal.category && (
          <span className="badge absolute top-3 right-3 bg-white/90 text-primary-700 backdrop-blur-sm dark:bg-zinc-900/90 dark:text-primary-400">
            {meal.category.name}
          </span>
        )}
        {discountPercentage > 0 && (
          <span className="badge absolute bottom-3 left-3 bg-red-600 text-white">
            {t("discountOff", { percent: discountPercentage })}
          </span>
        )}
        {meal.isPopular && (
          <span className="badge absolute bottom-3 right-3 bg-amber-400 text-amber-950">
            <Star className="h-3 w-3 fill-amber-950" />
            Popular
          </span>
        )}
        {!meal.isAvailable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            {t("outOfStock")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="text-base leading-snug font-bold text-zinc-900 dark:text-zinc-100">
            {meal.name}
          </h3>
          {meal.weightValue != null && meal.weightUnit && (
            <span className="mt-0.5 shrink-0 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              {formatMealWeight(meal.weightValue, meal.weightUnit)}
            </span>
          )}
        </div>
        {meal.description && (
          <p className="mb-3 line-clamp-2 flex-1 text-sm text-zinc-500 dark:text-zinc-400">
            {meal.description}
          </p>
        )}

        {macros.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-1.5 text-center">
            {macros.map((macro) => (
              <div key={macro.key} className="rounded-lg bg-zinc-50 px-1 py-1.5 dark:bg-zinc-800">
                <div className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                  {macro.label}
                </div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{macro.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex items-baseline gap-2">
            {discountPercentage > 0 && (
              <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
                {formatPriceFromPaise(meal.priceInPaise, currency)}
              </span>
            )}
            <span className="text-lg font-bold text-primary-700 dark:text-primary-400">
              {formatPriceFromPaise(discountedPriceInPaise, currency)}
            </span>
          </div>
          <AddToCartButton
            mealId={meal.id}
            name={meal.name}
            priceInPaise={discountedPriceInPaise}
            imageUrl={meal.imageUrl ?? undefined}
            disabled={!meal.isAvailable}
          />
        </div>
      </div>
    </article>
  );
}
