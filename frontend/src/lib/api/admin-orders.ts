import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

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
  address: AdminOrderAddress;
  user: { firstName: string; lastName: string | null; email: string };
}

export interface AdminOrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

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
}): Promise<{ data: AdminOrder[]; meta: AdminOrdersMeta }> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  const qs = search.toString();
  return proxyFetch(`/orders/admin${qs ? `?${qs}` : ""}`);
}

export function updateOrderStatus(id: string, status: string): Promise<AdminOrder> {
  return proxyFetch<AdminOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
