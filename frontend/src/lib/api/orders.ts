import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

export { ApiError };

export interface OrderItem {
  id: string;
  mealId: string | null;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
  isFreeItem: boolean;
}

export interface OrderAddress {
  contactPhone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotalInPaise: number;
  discountInPaise: number;
  couponCode: string | null;
  deliveryFeeInPaise: number;
  totalInPaise: number;
  deliveryDate: string;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  isInstant: boolean;
  razorpayOrderId: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  address: OrderAddress;
}

export interface CreateOrderInput {
  addressId: string;
  items: { mealId: string; quantity: number }[];
  notes?: string;
  isInstant?: boolean;
  deliveryDate?: string;
  deliverySlotId?: string;
  couponCode?: string;
}

export interface CreatedOrder {
  order: Order;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

export interface OrderPreview {
  subtotalInPaise: number;
  discountInPaise: number;
  couponApplied: boolean;
}

export type OrdersMeta = PaginationMeta;

export function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  return proxyFetch<CreatedOrder>("/orders", { method: "POST", body: JSON.stringify(input) });
}

export function previewOrder(input: {
  items: { mealId: string; quantity: number }[];
  couponCode?: string;
}): Promise<OrderPreview> {
  return proxyFetch<OrderPreview>("/orders/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listOrders(params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: Order[]; meta?: OrdersMeta }> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return proxyFetchPaginated<Order[]>(`/orders${qs ? `?${qs}` : ""}`);
}

export function getOrder(id: string): Promise<Order> {
  return proxyFetch<Order>(`/orders/${id}`);
}
