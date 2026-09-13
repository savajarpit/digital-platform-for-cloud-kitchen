"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, User } from "lucide-react";
import { listCustomers, type Customer } from "@/lib/api/admin-customers";

const PAGE_SIZE = 15;

/** A debounced, server-searched customer picker for the manual-order form —
 * same shape as MealCombobox (search-as-you-type, infinite scroll), but for
 * existing customer accounts. Manual order creation is deliberately scoped
 * to existing customers only; a walk-in with no account isn't supported yet. */
export function CustomerCombobox({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      setLoading(true);
      listCustomers({ page: 1, limit: PAGE_SIZE, search: search || undefined })
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
    if (loading) return;
    setLoading(true);
    const nextPage = page + 1;
    listCustomers({ page: nextPage, limit: PAGE_SIZE, search: search || undefined })
      .then(({ data, meta }) => {
        setResults((prev) => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(meta?.hasNext ?? false);
      })
      .finally(() => setLoading(false));
  }

  function handleSelect(customer: Customer) {
    onChange(customer);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full min-w-0 cursor-pointer items-center gap-2 py-2 text-left text-sm"
      >
        <User className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1 truncate">
          {value ? `${value.firstName} ${value.lastName ?? ""} — ${value.email}` : "Search customer by name or email…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-72 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative border-b border-zinc-100 p-2 dark:border-zinc-800">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="input w-full py-1.5 pl-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-950 ${
                  value?.id === customer.id ? "bg-primary-50 dark:bg-primary-950" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-zinc-700 dark:text-zinc-300">
                    {customer.firstName} {customer.lastName ?? ""}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{customer.email}</p>
                </div>
                {value?.id === customer.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
              </button>
            ))}
            {results.length === 0 && !loading && (
              <p className="px-2 py-4 text-center text-xs text-zinc-400">No customers match.</p>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="w-full px-2 py-2 text-center text-xs font-medium text-primary-600 hover:underline"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
