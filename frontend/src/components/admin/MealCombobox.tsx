"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ImageOff, Search } from "lucide-react";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { formatPriceFromPaise } from "@/lib/format/currency";

const PAGE_SIZE = 15;

/**
 * A single-meal picker that scales past a handful of items: the trigger only
 * needs the already-selected meal (cheap local lookup), but the dropdown's
 * own list is always a fresh, server-paginated, debounced-search fetch —
 * never "load every meal into the page up front" like a plain <select> would
 * force. Scrolling near the bottom fetches the next page automatically.
 */
export function MealCombobox({
  value,
  onChange,
  knownMeals,
  noneLabel = "To be announced",
  disabled,
}: {
  value: string;
  onChange: (mealId: string) => void;
  /** Used only to resolve the trigger's thumbnail/name for an already-picked
   * meal without a network round-trip — not the source of the dropdown's own
   * list. Fine if it doesn't include every meal in a large catalog. */
  knownMeals: Meal[];
  noneLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Meal[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const selectedMeal = knownMeals.find((m) => m.id === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Fresh page 1 whenever the popover opens or the search term changes.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      setLoading(true);
      listMeals({ page: 1, limit: PAGE_SIZE, search: search || undefined })
        .then(({ data, meta }) => {
          setResults(data);
          setPage(1);
          setHasMore(meta?.hasNext ?? false);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [open, search]);

  function loadMore() {
    setLoading((wasLoading) => {
      if (wasLoading) return wasLoading;
      const nextPage = page + 1;
      listMeals({ page: nextPage, limit: PAGE_SIZE, search: search || undefined })
        .then(({ data, meta }) => {
          setResults((prev) => [...prev, ...data]);
          setPage(nextPage);
          setHasMore(meta?.hasNext ?? false);
        })
        .finally(() => setLoading(false));
      return true;
    });
  }

  // Infinite scroll — load the next page once the sentinel at the list's
  // bottom enters view.
  useEffect(() => {
    if (!open || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasMore, results]);

  function handleSelect(mealId: string) {
    onChange(mealId);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full min-w-0 cursor-pointer items-center gap-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          {selectedMeal?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedMeal.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
              <ImageOff className="h-3 w-3" />
            </div>
          )}
        </div>
        <span className="min-w-0 flex-1 truncate">
          {value ? (selectedMeal?.name ?? "Meal selected") : noneLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 max-w-[90vw] overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative border-b border-zinc-100 p-2 dark:border-zinc-800">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            { }
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meals…"
              className="input w-full py-1.5 pl-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-950 ${
                !value ? "bg-primary-50 dark:bg-primary-950" : ""
              }`}
            >
              <span className="flex-1 text-zinc-500 dark:text-zinc-400">{noneLabel}</span>
              {!value && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
            </button>
            {results.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => handleSelect(meal.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-950 ${
                  value === meal.id ? "bg-primary-50 dark:bg-primary-950" : ""
                }`}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  {meal.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meal.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <ImageOff className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-zinc-700 dark:text-zinc-300">{meal.name}</p>
                  <p className="text-xs text-zinc-400">{formatPriceFromPaise(meal.priceInPaise)}</p>
                </div>
                {value === meal.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
              </button>
            ))}
            {results.length === 0 && !loading && (
              <p className="px-2 py-4 text-center text-xs text-zinc-400">No meals match.</p>
            )}
            <div ref={sentinelRef} className="h-px" />
            {loading && <p className="px-2 py-2 text-center text-xs text-zinc-400">Loading…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
