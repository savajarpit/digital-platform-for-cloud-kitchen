"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Search } from "lucide-react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";

const PAGE_SIZE = 12;

/**
 * Multi-select meal picker — server-paginated, debounced search, thumbnails,
 * infinite scroll (loads the next page once the sentinel at the bottom of
 * the scroll container enters view), same pattern as MealCombobox.
 */
export function MealPickerGrid({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (meal: Meal, checked: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  // Cached per search term (under the "menu" area, so any menu change
  // refreshes it); keeps the previous results visible while a new search loads.
  const { data, isError, hasNextPage, isFetching, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: qk.admin("menu", "meal-picker-grid", debouncedSearch),
    queryFn: ({ pageParam }) =>
      listMeals({ page: pageParam, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta?.hasNext ? last.meta.page + 1 : undefined),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const meals: Meal[] | null = data ? data.pages.flatMap((pg) => pg.data) : isError ? [] : null;
  const hasMore = Boolean(hasNextPage);

  function loadMore() {
    if (!isFetching) void fetchNextPage();
  }

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: scrollRef.current },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, meals]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products to add…"
          className="input w-full pl-8"
        />
      </div>

      <div ref={scrollRef} className="max-h-80 overflow-y-auto pr-1">
        {!meals ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <EmptyState compact title="No products match." />
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
        <div ref={sentinelRef} className="h-px" />
        {isFetchingNextPage && meals && meals.length > 0 && (
          <p className="py-2 text-center text-xs text-zinc-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
