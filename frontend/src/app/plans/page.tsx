import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import { getPublicConfig } from "@/lib/api/settings";
import { getCategories } from "@/lib/api/menu";

export default async function PlansPage() {
  const [config, t, categories] = await Promise.all([
    getPublicConfig(),
    getTranslations("home"),
    getCategories(),
  ]);

  return (
    <main className="container-app flex-1 py-16 text-center">
      <span className="badge mx-auto bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
        <CalendarClock className="h-3.5 w-3.5" />
        Coming soon
      </span>
      <h1 className="section-title mt-4 text-zinc-900 dark:text-zinc-100">{t("viewPlans")}</h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
        Weekly meal plans from {config.displayName} are on the way — build a custom plan
        from our menu and get it delivered on your schedule.
      </p>

      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <span key={c.id} className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              {c.name}
            </span>
          ))}
        </div>
      )}

      <Link href="/menu" className="btn-primary mt-10">
        Browse the full menu
      </Link>
    </main>
  );
}
