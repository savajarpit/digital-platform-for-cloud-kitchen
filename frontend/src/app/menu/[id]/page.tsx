import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getMeal } from "@/lib/api/menu";
import { MealGallery } from "@/components/menu/MealGallery";
import { MealPurchasePanel } from "@/components/menu/MealPurchasePanel";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatMealWeight } from "@/lib/format/weight";

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;
const MACRO_LABELS: Record<(typeof MACRO_KEYS)[number], string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export default async function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [meal, config, t] = await Promise.all([
    getMeal(id),
    getPublicConfig(),
    getTranslations("menu"),
  ]);

  if (!meal) notFound();

  const images = meal.imageUrls.length > 0 ? meal.imageUrls : meal.imageUrl ? [meal.imageUrl] : [];
  const discountPercentage = meal.activePromotion?.discountPercentage ?? 0;
  const discountedPriceInPaise =
    discountPercentage > 0
      ? meal.priceInPaise - Math.floor((meal.priceInPaise * discountPercentage) / 100)
      : meal.priceInPaise;
  const macros = MACRO_KEYS.map((key) => ({
    key,
    label: MACRO_LABELS[key],
    value: meal.nutrition[key],
  })).filter((m) => m.value !== undefined && m.value !== null && m.value !== "");

  return (
    <main className="container-app flex-1 py-10">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <MealGallery images={images} alt={meal.name} />

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 bg-white ${
                    meal.isVegetarian ? "border-green-600" : "border-red-600"
                  }`}
                  aria-label={meal.isVegetarian ? "Vegetarian" : "Non-vegetarian"}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meal.isVegetarian ? "bg-green-600" : "bg-red-600"}`} />
                </span>
                {meal.category && (
                  <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                    {meal.category.name}
                  </span>
                )}
                {meal.isPopular && (
                  <span className="badge bg-amber-400 text-amber-950">
                    <Star className="h-3 w-3 fill-amber-950" />
                    Popular
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {meal.name}
              </h1>
            </div>
            {meal.weightValue != null && meal.weightUnit && (
              <span className="mt-1 shrink-0 text-sm font-medium text-zinc-400 dark:text-zinc-500">
                {formatMealWeight(meal.weightValue, meal.weightUnit)}
              </span>
            )}
          </div>

          {meal.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{meal.description}</p>
          )}

          {macros.length > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {macros.map((macro) => (
                <div key={macro.key} className="rounded-lg bg-zinc-50 px-2 py-2 dark:bg-zinc-800">
                  <div className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                    {macro.label}
                  </div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {String(macro.value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            {discountPercentage > 0 && (
              <span className="text-base text-zinc-400 line-through dark:text-zinc-500">
                {formatPriceFromPaise(meal.priceInPaise, config.currency)}
              </span>
            )}
            <span className="text-2xl font-bold text-primary-700 dark:text-primary-400">
              {formatPriceFromPaise(discountedPriceInPaise, config.currency)}
            </span>
            {discountPercentage > 0 && (
              <span className="badge bg-red-600 text-white">
                {t("discountOff", { percent: discountPercentage })}
              </span>
            )}
          </div>

          {!meal.isAvailable ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {t("outOfStock")}
            </p>
          ) : (
            <div className="pt-2">
              <MealPurchasePanel meal={meal} priceInPaise={discountedPriceInPaise} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
