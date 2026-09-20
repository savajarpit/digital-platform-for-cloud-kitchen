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

      {/* Always mounted, even with zero meals: the category bar and filters
          stay put and the empty message renders inside MenuBrowser. */}
      <MenuBrowser
        initialMeals={meals}
        currency={config.currency}
        categories={categories}
        initialCategoryId={activeCategory?.id}
        initialSearch={search ?? ""}
      />
    </main>
  );
}
