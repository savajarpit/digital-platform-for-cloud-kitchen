import { getTranslations } from "next-intl/server";
import type { Meal } from "@/lib/api/menu";
import { formatPriceFromPaise } from "@/lib/format/currency";

export async function MealCard({ meal, currency }: { meal: Meal; currency: string }) {
  const t = await getTranslations("menu");

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800">
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
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7h18M3 12h18M3 17h18"
              />
            </svg>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 ${
            meal.isVegetarian ? "border-green-600" : "border-red-600"
          } bg-white`}
          aria-label={meal.isVegetarian ? "Vegetarian" : "Non-vegetarian"}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${meal.isVegetarian ? "bg-green-600" : "bg-red-600"}`}
          />
        </span>
        {!meal.isAvailable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            {t("outOfStock")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meal.name}</h3>
        {meal.description && (
          <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {meal.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
            {formatPriceFromPaise(meal.priceInPaise, currency)}
          </span>
        </div>
      </div>
    </article>
  );
}
