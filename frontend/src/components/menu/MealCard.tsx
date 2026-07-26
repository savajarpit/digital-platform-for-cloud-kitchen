import { getTranslations } from "next-intl/server";
import { ImageOff } from "lucide-react";
import type { Meal } from "@/lib/api/menu";
import { formatPriceFromPaise } from "@/lib/format/currency";
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

export async function MealCard({
  meal,
  currency,
  index = 0,
}: {
  meal: Meal;
  currency: string;
  index?: number;
}) {
  const t = await getTranslations("menu");
  const macros = MACRO_KEYS.map((key) => ({
    key,
    label: MACRO_LABELS[key],
    value: macroValue(meal.nutrition, key),
  })).filter((m) => m.value !== null);

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
        {!meal.isAvailable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            {t("outOfStock")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 text-base leading-snug font-bold text-zinc-900 dark:text-zinc-100">
          {meal.name}
        </h3>
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
          <span className="text-lg font-bold text-primary-700 dark:text-primary-400">
            {formatPriceFromPaise(meal.priceInPaise, currency)}
          </span>
          <AddToCartButton
            mealId={meal.id}
            name={meal.name}
            priceInPaise={meal.priceInPaise}
            imageUrl={meal.imageUrl ?? undefined}
            disabled={!meal.isAvailable}
          />
        </div>
      </div>
    </article>
  );
}
