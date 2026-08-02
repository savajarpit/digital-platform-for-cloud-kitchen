import { ApiError, proxyFetch } from "@/lib/api/client";

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
  dayNumber: number;
  slots: PlanSlot[];
}

export interface PlanDetail {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  priceInPaise: number;
  days: PlanDay[];
}

export interface UpcomingPreviewDay {
  date: string;
  skipped: boolean;
  meals: { slotType: MealSlotType; name: string | null }[];
}

export interface SubscriptionSummary {
  id: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  priceInPaiseSnapshot: number;
  planNameSnapshot: string;
  startDate: string | null;
  cycleEnd: string | null;
  bankedDays: number;
  plan: { name: string; type: "CURATED" | "CUSTOM" };
}

export interface SubscriptionDetail extends SubscriptionSummary {
  addressId: string;
  plan: SubscriptionSummary["plan"] & { durationDays: number; days: PlanDay[] };
  skips: { dateFrom: string; dateTo: string; bankedDays: number }[];
  upcoming: UpcomingPreviewDay[];
}

export function getPlan(id: string): Promise<PlanDetail> {
  return proxyFetch<PlanDetail>(`/subscriptions/plans/${id}`);
}

export function subscribe(input: {
  planId: string;
  addressId: string;
  couponCode?: string;
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

export function cancelSubscription(id: string): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/cancel`, { method: "POST" });
}
