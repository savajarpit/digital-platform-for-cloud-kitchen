import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";
import type { CancelRefundInput, Refund } from "@/lib/api/refunds";

export { ApiError };
export type { CancelRefundInput, Refund } from "@/lib/api/refunds";

export interface AdminOrderItem {
  id: string;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
}

export interface AdminOrderAddress {
  contactPhone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
}

export type AdminOrderFulfillmentType = "DELIVERY" | "PICKUP";
export type AdminOrderPaymentMethod = "RAZORPAY" | "CASH" | "UPI";

export interface AdminOrderPickupZone {
  pickupAddress: string | null;
  lat: number;
  lng: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotalInPaise: number;
  deliveryFeeInPaise: number;
  totalInPaise: number;
  deliveryDate: string;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  createdAt: string;
  items: AdminOrderItem[];
  fulfillmentType: AdminOrderFulfillmentType;
  address: AdminOrderAddress | null;
  pickupKitchenZone: AdminOrderPickupZone | null;
  user: { firstName: string; lastName: string | null; email: string };
  paymentMethod: AdminOrderPaymentMethod;
  createdByUserId: string | null;
}

export interface AdminOrderDetail extends AdminOrder {
  discountInPaise: number;
  couponCode: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  notes: string | null;
  isInstant: boolean;
  subscriptionId: string | null;
  userId: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  refunds: Refund[];
}

export type AdminOrdersMeta = PaginationMeta;

export const ADMIN_SETTABLE_STATUSES = [
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export function listAdminOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  fulfillmentType?: AdminOrderFulfillmentType;
}): Promise<{ data: AdminOrder[]; meta?: AdminOrdersMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  if (params.fulfillmentType) search.set("fulfillmentType", params.fulfillmentType);
  const qs = search.toString();
  return proxyFetchPaginated<AdminOrder[]>(`/orders/admin${qs ? `?${qs}` : ""}`);
}

export function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>(`/orders/admin/${id}`);
}

export function updateOrderStatus(id: string, status: string): Promise<AdminOrder> {
  return proxyFetch<AdminOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface CreateManualOrderInput {
  customerUserId: string;
  fulfillmentType?: "DELIVERY" | "PICKUP";
  addressId?: string;
  pickupKitchenZoneId?: string;
  items: { mealId: string; quantity: number }[];
  notes?: string;
  isInstant?: boolean;
  deliveryDate?: string;
  deliverySlotId?: string;
  couponCode?: string;
  paymentMethod: "CASH" | "UPI";
  overrideServiceability?: boolean;
}

/** Admin phone-order path — creates the order settled by cash/UPI, no
 * Razorpay involved. Lands PENDING_PAYMENT/PENDING; markOrderPaid() is the
 * separate call that actually confirms the money came in. */
export function createManualOrder(
  input: CreateManualOrderInput,
): Promise<{ order: AdminOrderDetail; serviceabilityOverridden: boolean }> {
  return proxyFetch<{ order: AdminOrderDetail; serviceabilityOverridden: boolean }>(
    "/orders/admin",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function markOrderPaid(id: string): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>(`/orders/admin/${id}/mark-paid`, { method: "POST" });
}

export function cancelOrderRefund(
  id: string,
  input: CancelRefundInput,
): Promise<{ order: AdminOrderDetail; refund: Refund }> {
  return proxyFetch<{ order: AdminOrderDetail; refund: Refund }>(`/orders/${id}/cancel-refund`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface OrdersOverview {
  today: { orders: number; revenueInPaise: number };
  last7Days: { orders: number; revenueInPaise: number };
  activeOrders: number;
  totalCustomers: number;
  allTimeRevenue: { orders: number; revenueInPaise: number };
  revenueTrend: { date: string; orders: number; revenueInPaise: number }[];
  statusBreakdown: { status: string; count: number }[];
  topMeals: { mealId: string | null; name: string; quantitySold: number }[];
}

export interface OverviewRangeParams {
  days?: number;
  from?: string;
  to?: string;
}

export function getOrdersOverview(params: OverviewRangeParams = {}): Promise<OrdersOverview> {
  const search = new URLSearchParams();
  if (params.from && params.to) {
    search.set("from", params.from);
    search.set("to", params.to);
  } else if (params.days) {
    search.set("days", String(params.days));
  }
  const qs = search.toString();
  return proxyFetch<OrdersOverview>(`/orders/admin/overview${qs ? `?${qs}` : ""}`);
}
