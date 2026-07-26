import { proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

export function listCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: Customer[]; meta?: PaginationMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.search) search.set("search", params.search);
  const qs = search.toString();
  return proxyFetchPaginated<Customer[]>(`/users/customers${qs ? `?${qs}` : ""}`);
}
