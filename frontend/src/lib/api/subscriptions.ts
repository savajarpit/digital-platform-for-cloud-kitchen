import { ApiError, proxyFetch } from "@/lib/api/client";
import type { Address } from "@/lib/api/addresses";
import type { DeliverySlot } from "@/lib/api/delivery-slots";

export { ApiError };

export type MealSlotType = "BREAKFAST" | "LUNCH" | "DINNER";

export interface PlanSlot {
  id: string;
  slotType: MealSlotType;
  mealId: string | null;
  meal: { id: string; name: string; imageUrl: string | null; priceInPaise: number } | null;
}

export interface PlanDay {
  id: string;
  dayNumber: number | null;
  weekNumber: number | null;
  weekday: number | null;
  slots: PlanSlot[];
}

export type SchedulingMode = "RELATIVE_DAY" | "WEEKLY_FIXED";

export interface PlanPreviewDay {
  date: string;
  meals: { slotType: MealSlotType; mealId: string | null; name: string | null; imageUrl: string | null }[];
}

export interface PlanDetail {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  priceInPaise: number;
  days: PlanDay[];
  schedulingMode: SchedulingMode;
  /** WEEKLY_FIXED plans only — a real, weekday-labeled rolling window
   * starting tomorrow, for browsing before subscribing. Null for
   * RELATIVE_DAY plans, which render `days` as authored instead. */
  previewWindow: PlanPreviewDay[] | null;
  timeSelectionEnabled: boolean;
  activePromotion?: { promotionName: string; discountPercentage: number } | null;
}

export interface UpcomingPreviewDay {
  date: string;
  skipped: boolean;
  meals: { slotType: MealSlotType; mealId: string | null; name: string | null; imageUrl: string | null }[];
  addressId: string;
  deliverySlotId: string | null;
  isOverridden: boolean;
  note: string | null;
  /** Too close to delivery to skip/pause/override — hide the controls and explain why instead of letting the request fail. */
  locked: boolean;
  /** Set only when this day was skipped by the business (a declared
   * disruption) rather than by the customer's own skip/pause. */
  disruptionReason: string | null;
}

export interface SubscriptionSummary {
  id: string;
  planId: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  priceInPaiseSnapshot: number;
  planNameSnapshot: string;
  couponCode: string | null;
  bonusDaysGranted: number;
  startDate: string | null;
  cycleEnd: string | null;
  bankedDays: number;
  plan: { name: string; type: "CURATED" | "CUSTOM" };
}

export interface SubscriptionDetail extends SubscriptionSummary {
  addressId: string;
  deliverySlotId: string | null;
  plan: SubscriptionSummary["plan"] & { durationDays: number; days: PlanDay[] };
  skips: { dateFrom: string; dateTo: string; bankedDays: number }[];
  dayOverrides: { date: string; addressId: string | null; deliverySlotId: string | null }[];
  address: Address;
  deliverySlot: DeliverySlot | null;
  upcoming: UpcomingPreviewDay[];
  addresses: Address[];
  deliverySlots: DeliverySlot[];
  canCancel: boolean;
  /** False when the SUPER_ADMIN has locked delivery-time selection for this tenant's plans — only address changes remain available. */
  canOverrideTime: boolean;
  /** The earliest date (YYYY-MM-DD) a skip/pause/override can still target — anything before this is within the notice window and should show as locked, not be submitted and rejected. */
  earliestEditableDate: string;
}

export interface SubscriptionInvoice {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountInPaise: number;
  status: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
}

/** What GET /subscriptions/mine/:id/invoice actually returns for its
 * `subscription` field — the bare row plus just the address, NOT the full
 * SubscriptionDetail shape (no plan/skips/upcoming/addresses list/etc.). */
export interface SubscriptionForInvoice extends SubscriptionSummary {
  address: Address;
}

export function getPlan(id: string): Promise<PlanDetail> {
  return proxyFetch<PlanDetail>(`/subscriptions/plans/${id}`);
}

/** Client-safe check for the tenant's subscriptions-enabled master switch —
 * used to bounce a direct visit to a plan detail page while it's disabled. */
export function getSubscriptionsEnabled(): Promise<boolean> {
  return proxyFetch<{ isEnabled: boolean }>("/subscriptions/settings/public").then(
    (settings) => settings.isEnabled,
  );
}

export function subscribe(input: {
  planId: string;
  addressId: string;
  couponCode?: string;
  deliverySlotId?: string;
}): Promise<{ subscriptionId: string; razorpayOrderId: string; razorpayKeyId: string; amountInPaise: number }> {
  return proxyFetch("/subscriptions", { method: "POST", body: JSON.stringify(input) });
}

export function verifySubscriptionPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ confirmed: true }> {
  return proxyFetch("/subscriptions/payments/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMySubscriptions(): Promise<SubscriptionSummary[]> {
  return proxyFetch<SubscriptionSummary[]>("/subscriptions/mine");
}

export function getMySubscription(id: string): Promise<SubscriptionDetail> {
  return proxyFetch<SubscriptionDetail>(`/subscriptions/mine/${id}`);
}

export function getSubscriptionInvoice(
  id: string,
): Promise<{ invoice: SubscriptionInvoice; subscription: SubscriptionForInvoice }> {
  return proxyFetch(`/subscriptions/mine/${id}/invoice`);
}

export function skipDay(id: string, date: string): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export function pauseSubscription(id: string, dateFrom: string, dateTo: string): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/pause`, {
    method: "POST",
    body: JSON.stringify({ dateFrom, dateTo }),
  });
}

export function setDayOverride(
  id: string,
  input: { date: string; addressId?: string; deliverySlotId?: string; note?: string },
): Promise<{ date: string; addressId: string | null; deliverySlotId: string | null; note?: string | null }> {
  return proxyFetch(`/subscriptions/mine/${id}/day-override`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelSubscription(id: string): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/cancel`, { method: "POST" });
}
