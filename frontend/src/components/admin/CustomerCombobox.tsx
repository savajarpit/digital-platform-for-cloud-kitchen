"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, User, UserPlus, X } from "lucide-react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { listCustomers, type Customer } from "@/lib/api/admin-customers";
import { qk, STALE } from "@/lib/query/keys";
import { ComboboxRowsSkeleton } from "@/components/ui/skeletons/ComboboxRowsSkeleton";
import { CreateCustomerDialog } from "@/components/admin/CreateCustomerDialog";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

const PAGE_SIZE = 15;

/** A debounced, server-searched customer picker for the manual order/
 * subscription forms — same shape as MealCombobox (search-as-you-type,
 * infinite scroll). Staff with `customers.manage` can also create a new
 * customer right from the dropdown (phone-in orders); it's selected as soon
 * as it's created. */
export function CustomerCombobox({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const canCreate = usePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  // Cached per search term (under the "customers" area).
  const { data, hasNextPage, isFetching, isPlaceholderData, fetchNextPage } = useInfiniteQuery({
    queryKey: qk.admin("customers", "picker", debouncedSearch),
    queryFn: ({ pageParam }) =>
      listCustomers({ page: pageParam, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta?.hasNext ? last.meta.page + 1 : undefined),
    enabled: open,
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });
  const results: Customer[] = data ? data.pages.flatMap((pg) => pg.data) : [];
  const hasMore = Boolean(hasNextPage);
  const loading = isFetching;
  // A new, not-yet-cached search (or the very first load) shows skeleton rows
  // instead of the previous term's results.
  const showSkeleton = isPlaceholderData || (!data && isFetching);

  function loadMore() {
    if (!isFetching) void fetchNextPage();
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
          {value
            ? `${value.firstName} ${value.lastName ?? ""} — ${value.email}`
            : "Search customer by name, email or phone…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-72 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative border-b border-zinc-100 p-2 dark:border-zinc-800">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="input w-full py-1.5 pr-8 pl-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-3.5 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {showSkeleton && <ComboboxRowsSkeleton />}
            {!showSkeleton && results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-950 ${
                  value?.id === customer.id ? "bg-primary-50 dark:bg-primary-950" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word text-zinc-700 dark:text-zinc-300">
                    {customer.firstName} {customer.lastName ?? ""}
                  </p>
                  <p className="text-xs wrap-break-word text-zinc-400">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                {value?.id === customer.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
              </button>
            ))}
            {!showSkeleton && results.length === 0 && !loading && (
              <p className="px-2 py-4 text-center text-xs text-zinc-400">No customers match.</p>
            )}
            {!showSkeleton && hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="w-full cursor-pointer px-2 py-2 text-center text-xs font-medium text-primary-600 hover:underline"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setCreating(search);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 border-t border-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-primary-600 hover:bg-primary-50 dark:border-zinc-800 dark:hover:bg-primary-950"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="wrap-break-word">{search.trim() ? `Create new customer "${search.trim()}"` : "Create new customer"}</span>
            </button>
          )}
        </div>
      )}

      {creating !== null && (
        <CreateCustomerDialog
          open
          initialSearch={creating}
          onClose={() => setCreating(null)}
          onCreated={(customer) => {
            setSearch("");
            onChange(customer);
          }}
        />
      )}
    </div>
  );
}
