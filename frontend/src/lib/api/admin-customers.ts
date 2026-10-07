import { proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";
import type { Address, AddressInput } from "@/lib/api/addresses";

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

export interface CustomerAddress {
  id: string;
  label: string | null;
  contactPhone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  paymentStatus: string;
  totalInPaise: number;
  createdAt: string;
}

export interface CustomerSubscription {
  id: string;
  status: string;
  planNameSnapshot: string;
  priceInPaiseSnapshot: number;
  startDate: string | null;
  cycleEnd: string | null;
  createdAt: string;
  plan: { name: string };
}

export interface CustomerDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  verifiedAt: string | null;
  createdAt: string;
  /** An admin-sent "set your password" link is still unused. */
  invitePending: boolean;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  subscriptions: CustomerSubscription[];
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

export function getCustomer(id: string): Promise<CustomerDetail> {
  return proxyFetch<CustomerDetail>(`/users/customers/${id}`);
}

export interface CreateCustomerInput {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  sendInvite: boolean;
}

export function createCustomer(input: CreateCustomerInput): Promise<{ customer: Customer; address: Address | null }> {
  return proxyFetch(`/users/customers`, { method: "POST", body: JSON.stringify(input) });
}

export function resendCustomerInvite(id: string): Promise<null> {
  return proxyFetch<null>(`/users/customers/${id}/invite`, { method: "POST" });
}

export function addCustomerAddress(id: string, input: AddressInput): Promise<Address> {
  return proxyFetch<Address>(`/users/customers/${id}/addresses`, { method: "POST", body: JSON.stringify(input) });
}
