"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Search } from "lucide-react";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import type { PaginationMeta } from "@/lib/api/response";
import { formatPriceFromPaise } from "@/lib/format/currency";

const PAGE_SIZE = 9;

export function MealPickerGrid({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (meal: Meal, checked: boolean) => void;
}) {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      listMeals({ page, limit: PAGE_SIZE, search: search || undefined })
        .then(({ data, meta }) => {
          setMeals(data);
          setMeta(meta ?? null);
        })
        .catch(() => setMeals([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [page, search]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products to add…"
          className="input w-full pl-8"
        />
      </div>

      {!meals ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">No products match.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {meals.map((meal) => {
            const checked = selectedIds.includes(meal.id);
            return (
              <label
                key={meal.id}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border p-2 transition-colors ${
                  checked
                    ? "border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-950/30"
                    : "border-zinc-100 hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(meal, e.target.checked)}
                    className="h-3.5 w-3.5 shrink-0 accent-primary-600"
                  />
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                    {meal.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meal.imageUrl} alt={meal.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{meal.name}</p>
                  <p className="text-xs text-zinc-400">{formatPriceFromPaise(meal.priceInPaise)}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-400">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
