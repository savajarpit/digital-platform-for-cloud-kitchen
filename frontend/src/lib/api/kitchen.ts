import { proxyFetch } from "@/lib/api/client";

export type KitchenStage = "NEW" | "PREPARING" | "READY" | "DONE";
export type KitchenFulfillmentType =
  "DELIVERY" | "PICKUP" | "DINE_IN" | "TAKEAWAY";

/** Which optional parts of the Kitchen screen this business has. */
export interface KitchenFlags {
  subscriptions: boolean;
  dineIn: boolean;
  pickup: boolean;
  addons: boolean;
}

export interface KitchenMeta {
  today: string;
  minDate: string;
  maxDate: string;
  flags: KitchenFlags;
  canUpdate: boolean;
  canSeeContact: boolean;
  slots: { id: string; name: string; startTime: string; endTime: string }[];
  plans: { id: string; name: string }[];
}

export interface KitchenCardItem {
  name: string;
  quantity: number;
  isFreeItem: boolean;
  categoryId: string | null;
  categoryName: string | null;
  addons: { name: string; quantity: number }[];
}

/** One order as the kitchen sees it — never any prices; `contact` only for
 * staff who can also manage orders. */
export interface KitchenCard {
  id: string;
  orderNumber: string;
  status: string;
  stage: KitchenStage;
  fulfillmentType: KitchenFulfillmentType;
  isInstant: boolean;
  slotId: string | null;
  slotName: string;
  windowStart: string | null;
  windowEnd: string | null;
  dueMinutes: number;
  placedAt: string;
  customerName: string;
  area: string | null;
  items: KitchenCardItem[];
  prepNotes: string | null;
  deliveryNote: string | null;
  plan: {
    subscriptionId: string;
    planId: string | null;
    planName: string;
    dayLabel: string;
    customerNote: string | null;
  } | null;
  dayChanged: boolean;
  cancelRequested: boolean;
  hasNotes: boolean;
  hasAddons: boolean;
  contact: {
    fullName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
}

export interface KitchenBoard {
  date: string;
  counts: Record<KitchenStage, number>;
  orders: KitchenCard[];
}

export interface KitchenPrepSummary {
  date: string;
  items: {
    name: string;
    categoryName: string | null;
    toCook: number;
    done: number;
  }[];
  addons: { name: string; quantity: number }[];
  specialRequests: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    slotName: string;
    items: string;
    note: string;
  }[];
  categories: { id: string; name: string }[];
  ordersToCook: number;
}

/** Every filter the board and prep summary understand (all optional). */
export interface KitchenQuery {
  date?: string;
  kind?: "ORDERS" | "PLAN";
  slot?: string;
  type?: KitchenFulfillmentType;
  stage?: KitchenStage;
  hasNotes?: boolean;
  hasAddons?: boolean;
  planId?: string;
  changedOnly?: boolean;
  q?: string;
  sort?: "time" | "placed";
  category?: string;
}

/** Slot filter value for ASAP orders. */
export const INSTANT_SLOT = "INSTANT";

function toQueryString(query: KitchenQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getKitchenMeta(): Promise<KitchenMeta> {
  return proxyFetch<KitchenMeta>("/kitchen/meta");
}

export function getKitchenBoard(query: KitchenQuery): Promise<KitchenBoard> {
  return proxyFetch<KitchenBoard>(`/kitchen/orders${toQueryString(query)}`);
}

export function getKitchenPrepSummary(
  query: KitchenQuery,
): Promise<KitchenPrepSummary> {
  return proxyFetch<KitchenPrepSummary>(
    `/kitchen/prep-summary${toQueryString(query)}`,
  );
}

/** Start (PREPARING), Mark ready (READY), or undo Mark ready (PREPARING). */
export function moveKitchenOrder(
  id: string,
  status: "PREPARING" | "READY",
): Promise<KitchenCard> {
  return proxyFetch<KitchenCard>(`/kitchen/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
