import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Clock, Leaf, ShieldCheck, Truck } from "lucide-react";
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-zinc-950 dark:to-zinc-900" />
        <div className="absolute top-20 right-0 z-0 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/30" />

        <div className="container-app relative flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            <Leaf className="h-3.5 w-3.5" />
            Fresh &amp; healthy
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-zinc-50">
            {config.displayName}
          </h1>
          <p className="max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Fresh, healthy meals delivered to your door.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/menu" className="btn-primary btn-lg">
              {t("heroCta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/plans" className="btn-outline btn-lg">
              {t("viewPlans")}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Free delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fresh guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {specials.length > 0 && (
        <section className="container-app py-16 sm:py-20">
          <h2 className="section-title text-zinc-900 dark:text-zinc-100">{t("todaysSpecial")}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {specials.map((meal, index) => (
              <MealCard key={meal.id} meal={meal} currency={config.currency} index={index} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
