"use client";

import { useEffect, useState } from "react";
import { Search, Star } from "lucide-react";
import type { Meal } from "@/lib/api/menu";
import { fetchMealsClient, type MealSortOption } from "@/lib/api/menu-client";
import { MealCard } from "./MealCard";

export function MenuBrowser({
  initialMeals,
  currency,
  categoryId,
  initialSearch = "",
}: {
  initialMeals: Meal[];
  currency: string;
  categoryId?: string;
  initialSearch?: string;
}) {
  const [meals, setMeals] = useState(initialMeals);
  const [search, setSearch] = useState(initialSearch);
  const [vegOnly, setVegOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [sort, setSort] = useState<MealSortOption | "default">("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      fetchMealsClient({
        categoryId,
        search: search || undefined,
        isVegetarian: vegOnly ? true : undefined,
        isPopular: popularOnly ? true : undefined,
        sortBy: sort === "default" ? undefined : sort,
      })
        .then(setMeals)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [categoryId, search, vegOnly, popularOnly, sort]);

  return (
    <div>
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as MealSortOption | "default")}
          className="input w-auto"
        >
          <option value="default">Sort: Featured</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <button
          type="button"
          onClick={() => setVegOnly((v) => !v)}
          className={`badge cursor-pointer ${
            vegOnly
              ? "bg-green-600 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Veg only
        </button>
        <button
          type="button"
          onClick={() => setPopularOnly((v) => !v)}
          className={`badge cursor-pointer ${
            popularOnly
              ? "bg-amber-400 text-amber-950"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Star className="h-3 w-3" />
          Popular
        </button>
      </div>

      {meals.length === 0 ? (
        <p className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {loading ? "Searching…" : "No dishes match your search."}
        </p>
      ) : (
        <div
          className={`mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}
        >
          {meals.map((meal, index) => (
            <MealCard key={meal.id} meal={meal} currency={currency} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
