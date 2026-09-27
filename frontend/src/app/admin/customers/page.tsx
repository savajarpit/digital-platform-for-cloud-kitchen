"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/lib/api/admin-customers";
import { qk, STALE } from "@/lib/query/keys";
import { TableSkeleton } from "@/components/ui/skeletons/TableSkeleton";
import { TableRowsSkeleton } from "@/components/ui/skeletons/TableRowsSkeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { CreateCustomerDialog } from "@/components/admin/CreateCustomerDialog";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

export default function CustomersPage() {
  const router = useRouter();
  const canCreate = usePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const [creating, setCreating] = useState(false);
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email or phone"
            className="w-full sm:w-64"
          />
          {canCreate && (
            <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm cursor-pointer">
              <UserPlus className="h-4 w-4" />
              Add customer
            </button>
          )}
        </div>
      </div>

      {creating && (
        <CreateCustomerDialog
          open
          onClose={() => setCreating(false)}
          onCreated={(customer) => router.push(`/admin/customers/${customer.id}`)}
        />
      )}

      <CustomersTable page={page} search={debouncedSearch} onPageChange={setPage} />
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
  // Keyed on every request input. While a not-yet-cached page/search loads
  // (isPlaceholderData) the table shell stays mounted and the rows are skeletons.
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: qk.admin("customers", page, search),
    queryFn: () => listCustomers({ page, search: search || undefined }),
    staleTime: STALE.short,
    placeholderData: keepPreviousData,
  });

  if (isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
        Couldn&apos;t load customers.
      </p>
    );
  }

  if (isPending) return <TableSkeleton cols={5} rows={6} />;

  const customers = data.data;
  const meta = data.meta ?? null;

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
          {isPlaceholderData && <TableRowsSkeleton cols={5} rows={6} />}
          {!isPlaceholderData && customers.map((customer) => (
            <tr key={customer.id} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
              <td className="px-5 py-3 font-medium">
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="text-zinc-900 hover:text-primary-600 hover:underline dark:text-zinc-100"
                >
                  {customer.firstName} {customer.lastName ?? ""}
                </Link>
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
          {!isPlaceholderData && customers.length === 0 && (
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
