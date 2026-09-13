import { ApiError, proxyFetch } from "@/lib/api/client";
import type { AdminOrderDetail } from "@/lib/api/admin-orders";

export { ApiError };

export interface DiningTable {
  id: string;
  tenantId: string;
  kitchenZoneId: string;
  label: string;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Set to the active order's id when occupied — null means free. Derived
   * server-side from live order state, never a stored status. */
  activeOrderId: string | null;
}

export interface DiningTableInput {
  kitchenZoneId: string;
  label: string;
  capacity?: number;
}

export function listDiningTables(kitchenZoneId?: string): Promise<DiningTable[]> {
  const qs = kitchenZoneId ? `?kitchenZoneId=${kitchenZoneId}` : "";
  return proxyFetch<DiningTable[]>(`/dining-tables${qs}`);
}

export function createDiningTable(input: DiningTableInput): Promise<DiningTable> {
  return proxyFetch<DiningTable>("/dining-tables", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDiningTable(
  id: string,
  input: Partial<Omit<DiningTableInput, "kitchenZoneId">> & { isActive?: boolean },
): Promise<DiningTable> {
  return proxyFetch<DiningTable>(`/dining-tables/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteDiningTable(id: string): Promise<void> {
  return proxyFetch<void>(`/dining-tables/${id}`, { method: "DELETE" });
}

export type WaitlistStatus = "WAITING" | "SEATED" | "CANCELLED";

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  kitchenZoneId: string;
  guestName: string | null;
  guestPhone: string | null;
  partySize: number;
  status: WaitlistStatus;
  seatedOrderId: string | null;
  createdAt: string;
  seatedAt: string | null;
  cancelledAt: string | null;
}

export interface CreateWaitlistEntryInput {
  kitchenZoneId: string;
  guestName?: string;
  guestPhone?: string;
  partySize?: number;
}

/** Only ever returns WAITING entries — a queue, never an order. */
export function listWaitlist(kitchenZoneId?: string): Promise<WaitlistEntry[]> {
  const qs = kitchenZoneId ? `?kitchenZoneId=${kitchenZoneId}` : "";
  return proxyFetch<WaitlistEntry[]>(`/waitlist${qs}`);
}

export function addToWaitlist(input: CreateWaitlistEntryInput): Promise<WaitlistEntry> {
  return proxyFetch<WaitlistEntry>("/waitlist", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelWaitlistEntry(id: string): Promise<WaitlistEntry> {
  return proxyFetch<WaitlistEntry>(`/waitlist/${id}/cancel`, { method: "POST" });
}

export interface CreateDineInOrderInput {
  kitchenZoneId: string;
  fulfillmentType: "DINE_IN" | "TAKEAWAY";
  tableId?: string;
  customerUserId?: string;
  guestName?: string;
  guestPhone?: string;
  items?: { mealId: string; quantity: number }[];
  notes?: string;
}

/** Opens a running order at the counter — table and guest details are all
 * optional, matching a real POS's "pick items, save" flow. */
export function createDineInOrder(input: CreateDineInOrderInput): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>("/orders/admin/dine-in", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface SeatWaitlistEntryInput {
  tableId: string;
  customerUserId?: string;
  guestName?: string;
  guestPhone?: string;
  items?: { mealId: string; quantity: number }[];
}

/** The only place a Waitlist entry ever turns into a real Order. */
export function seatWaitlistEntry(
  waitlistEntryId: string,
  input: SeatWaitlistEntryInput,
): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>(`/orders/admin/waitlist/${waitlistEntryId}/seat`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Appends another round of items to a still-open DINE_IN/TAKEAWAY order. */
export function addOrderItems(
  orderId: string,
  items: { mealId: string; quantity: number }[],
): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>(`/orders/admin/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

/** Assigns or moves a DINE_IN order to a different table. */
export function assignOrderTable(orderId: string, tableId: string): Promise<AdminOrderDetail> {
  return proxyFetch<AdminOrderDetail>(`/orders/admin/${orderId}/assign-table`, {
    method: "POST",
    body: JSON.stringify({ tableId }),
  });
}
