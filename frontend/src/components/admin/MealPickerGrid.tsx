"use client";

import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { MealThumb } from "@/components/ui/MealThumb";

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
  // refreshes it); while a not-yet-cached search loads (isPlaceholderData) the
  // grid shows skeleton tiles instead of the previous term's results.
  const {
    data,
    isError,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPlaceholderData,
    fetchNextPage,
  } = useInfiniteQuery({
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
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search products to add…"
        className="w-full"
      />

      <div ref={scrollRef} className="max-h-80 overflow-y-auto pr-1">
        {!meals || isPlaceholderData ? (
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
                      <MealThumb src={meal.imageUrl} alt={meal.name} iconClassName="h-4 w-4" />
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
