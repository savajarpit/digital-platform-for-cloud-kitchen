import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getCategories, getMeals } from "@/lib/api/menu";
import { MenuBrowser } from "@/components/menu/MenuBrowser";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { category: activeSlug, search } = await searchParams;

  const [config, t, categories] = await Promise.all([
    getPublicConfig(),
    getTranslations("menu"),
    getCategories(),
  ]);

  const activeCategory = activeSlug
    ? categories.find((c) => c.slug === activeSlug)
    : undefined;
  const meals = await getMeals({
    categoryId: activeCategory?.id,
    search: search || undefined,
  });

  return (
    <main className="container-app flex-1 py-10">
      <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      {categories.length > 0 && (
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Categories">
          <Link
            href="/menu"
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-primary-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/menu?category=${c.slug}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory?.id === c.id
                  ? "bg-primary-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {meals.length === 0 && !search ? (
        <p className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No meals available right now — check back soon.
        </p>
      ) : (
        <MenuBrowser
          initialMeals={meals}
          currency={config.currency}
          categoryId={activeCategory?.id}
          initialSearch={search ?? ""}
        />
      )}
    </main>
  );
}
