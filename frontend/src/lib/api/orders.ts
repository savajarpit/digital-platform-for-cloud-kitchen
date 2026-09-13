import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

export { ApiError };

export interface OrderItemAddon {
  id: string;
  addonItemId: string | null;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  mealId: string | null;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
  isFreeItem: boolean;
  addons?: OrderItemAddon[];
}

export interface OrderAddress {
  contactPhone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

export type OrderFulfillmentType = "DELIVERY" | "PICKUP";

export interface OrderPickupZone {
  pickupAddress: string | null;
  lat: number;
  lng: number;
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
  prepNotes: string | null;
  createdAt: string;
  items: OrderItem[];
  fulfillmentType: OrderFulfillmentType;
  address: OrderAddress | null;
  pickupKitchenZone: OrderPickupZone | null;
}

export interface CreateOrderItemInput {
  mealId: string;
  quantity: number;
  addons?: { addonItemId: string; quantity: number }[];
}

export interface CreateOrderInput {
  fulfillmentType?: OrderFulfillmentType;
  addressId?: string;
  pickupKitchenZoneId?: string;
  items: CreateOrderItemInput[];
  notes?: string;
  prepNotes?: string;
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
  items: CreateOrderItemInput[];
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
