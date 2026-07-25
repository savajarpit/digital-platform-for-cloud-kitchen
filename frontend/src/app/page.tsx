import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getMeals } from "@/lib/api/menu";
import { MealCard } from "@/components/menu/MealCard";

const SPECIALS_COUNT = 4;

export default async function Home() {
  const [config, t, meals] = await Promise.all([
    getPublicConfig(),
    getTranslations("home"),
    getMeals(),
  ]);
  const specials = meals.slice(0, SPECIALS_COUNT);

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary-700 sm:text-4xl md:text-5xl">
          {config.displayName}
        </h1>
        <p className="max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Fresh, healthy meals delivered to your door.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:text-base"
          >
            {t("heroCta")}
          </Link>
          <Link
            href="/plans"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-primary-600 hover:text-primary-600 sm:text-base dark:border-zinc-700 dark:text-zinc-200"
          >
            {t("viewPlans")}
          </Link>
        </div>
      </section>

      {specials.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
            {t("todaysSpecial")}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {specials.map((meal) => (
              <MealCard key={meal.id} meal={meal} currency={config.currency} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
