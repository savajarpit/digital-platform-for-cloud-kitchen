import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getCategories } from "@/lib/api/menu";

export default async function PlansPage() {
  const [config, t, categories] = await Promise.all([
    getPublicConfig(),
    getTranslations("home"),
    getCategories(),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
        {t("viewPlans")}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
        Weekly meal plans from {config.displayName} are on the way — build a custom plan
        from our menu and get it delivered on your schedule.
      </p>

      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300"
            >
              {c.name}
            </span>
          ))}
        </div>
      )}

      <Link
        href="/menu"
        className="mt-10 inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        Browse the full menu
      </Link>
    </main>
  );
}
