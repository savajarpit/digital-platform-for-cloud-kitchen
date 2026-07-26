import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface OrderItem {
  id: string;
  mealId: string | null;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
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
  deliveryFeeInPaise: number;
  totalInPaise: number;
  deliveryDate: string;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
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
  deliveryDate: string;
  deliverySlotId: string;
}

export interface CreatedOrder {
  order: Order;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

export function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  return proxyFetch<CreatedOrder>("/orders", { method: "POST", body: JSON.stringify(input) });
}

export function listOrders(): Promise<Order[]> {
  return proxyFetch<Order[]>("/orders");
}

export function getOrder(id: string): Promise<Order> {
  return proxyFetch<Order>(`/orders/${id}`);
}
