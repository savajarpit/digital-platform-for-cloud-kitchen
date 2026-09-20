"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, SearchX, Star, TriangleAlert } from "lucide-react";
import type { Meal, MenuCategory } from "@/lib/api/menu";
import { fetchMealsOrThrow, type MealSortOption } from "@/lib/api/menu-client";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MealCard } from "./MealCard";

const PILL_BASE = "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors";
const PILL_ACTIVE = "bg-primary-600 text-white";
const PILL_IDLE =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const CHIP_IDLE =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

export function MenuBrowser({
  initialMeals,
  currency,
  categories,
  initialCategoryId,
  initialSearch = "",
}: {
  initialMeals: Meal[];
  currency: string;
  categories: MenuCategory[];
  initialCategoryId?: string;
  initialSearch?: string;
}) {
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [vegOnly, setVegOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [sort, setSort] = useState<MealSortOption | "default">("default");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const isInitialView =
    categoryId === initialCategoryId &&
    debouncedSearch === initialSearch &&
    !vegOnly &&
    !popularOnly &&
    sort === "default";

  const filters = {
    categoryId,
    search: debouncedSearch || undefined,
    isVegetarian: vegOnly ? true : undefined,
    isPopular: popularOnly ? true : undefined,
    sortBy: sort === "default" ? undefined : sort,
  };

  // The server already rendered the first view, so it seeds the cache and no
  // request fires on mount. Later filters are cached per combination (going
  // back to a filter you already used is instant) and the previous results
  // stay on screen while the next set loads - the grid never blanks or dims.
  const { data, isError, refetch } = useQuery({
    queryKey: qk.meals.list(filters),
    queryFn: () => fetchMealsOrThrow(filters),
    initialData: isInitialView ? initialMeals : undefined,
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });
  const meals = data ?? [];
  const hasActiveFilter = Boolean(categoryId || debouncedSearch || vegOnly || popularOnly);

  // Category is client state, not a navigation: clicking a pill must not
  // re-render the route on the server (that swaps in the full-page loading
  // skeleton and resets the search/filters). The URL is kept in sync so the
  // view stays shareable/refreshable.
  function selectCategory(id: string | undefined) {
    setCategoryId(id);
    const slug = categories.find((c) => c.id === id)?.slug;
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("category", slug);
    else url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      {categories.length > 0 && (
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Categories">
          <button
            type="button"
            aria-pressed={!categoryId}
            onClick={() => selectCategory(undefined)}
            className={`${PILL_BASE} ${!categoryId ? PILL_ACTIVE : PILL_IDLE}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => selectCategory(c.id)}
              className={`${PILL_BASE} ${categoryId === c.id ? PILL_ACTIVE : PILL_IDLE}`}
            >
              {c.name}
            </button>
          ))}
        </nav>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="input w-full pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as MealSortOption | "default")}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Sort: Featured</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setVegOnly((v) => !v)}
          aria-pressed={vegOnly}
          className={`badge cursor-pointer transition-colors ${
            vegOnly ? "bg-green-600 text-white" : CHIP_IDLE
          }`}
        >
          Veg only
        </button>
        <button
          type="button"
          onClick={() => setPopularOnly((v) => !v)}
          aria-pressed={popularOnly}
          className={`badge cursor-pointer transition-colors ${
            popularOnly ? "bg-amber-400 text-amber-950" : CHIP_IDLE
          }`}
        >
          <Star className="h-3 w-3" />
          Popular
        </button>
      </div>

      {/* Results live in one stable container: empty / error states render
          here, inside the same page column, never replacing the page shell. */}
      <div className="mt-8">
        {isError ? (
          <EmptyState
            icon={TriangleAlert}
            title="Couldn't load the menu"
            description="Please check your connection and try again."
            action={
              <button type="button" onClick={() => refetch()} className="btn-outline btn-sm">
                Try again
              </button>
            }
          />
        ) : meals.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={hasActiveFilter ? "No dishes match your search." : "No meals available right now."}
            description={
              hasActiveFilter ? "Try a different search or clear your filters." : "Check back soon."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} currency={currency} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
