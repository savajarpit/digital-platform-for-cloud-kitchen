"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { listCustomers, type Customer } from "@/lib/api/admin-customers";
import type { PaginationMeta } from "@/lib/api/response";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-primary-600">
          <Users className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Customers
          </h2>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="input pl-9"
          />
        </div>
      </div>

      {/* Keyed by page+search so switching either remounts fresh instead of a
          synchronous setState-to-null in an effect. */}
      <CustomersTable key={`${page}-${debouncedSearch}`} page={page} search={debouncedSearch} onPageChange={setPage} />
    </div>
  );
}

function CustomersTable({
  page,
  search,
  onPageChange,
}: {
  page: number;
  search: string;
  onPageChange: (page: number) => void;
}) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCustomers({ page, search: search || undefined })
      .then(({ data, meta }) => {
        setCustomers(data);
        setMeta(meta ?? null);
      })
      .catch(() => setError("Couldn't load customers."));
  }, [page, search]);

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (!customers) {
    return (
      <div className="card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-zinc-50 px-5 py-3 last:border-none dark:border-zinc-900">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Contact</th>
            <th className="px-5 py-3">Joined</th>
            <th className="px-5 py-3">Orders</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
              <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {customer.firstName} {customer.lastName ?? ""}
              </td>
              <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                <p>{customer.email}</p>
                {customer.phone && <p className="text-xs text-zinc-400">{customer.phone}</p>}
              </td>
              <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(customer.createdAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300">{customer.orderCount}</td>
              <td className="px-5 py-3">
                <span
                  className={`badge ${
                    customer.isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {customer.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                No customers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {meta.page} of {meta.totalPages} · {meta.total} customers
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={!meta.hasPrev}
              className="btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
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
