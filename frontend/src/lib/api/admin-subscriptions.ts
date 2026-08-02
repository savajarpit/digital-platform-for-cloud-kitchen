import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";

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

export type PlanAccentColor = "PRIMARY" | "SECONDARY" | "ACCENT";

export interface Plan {
  id: string;
  type: "CURATED" | "CUSTOM";
  name: string;
  description: string | null;
  durationDays: number;
  priceInPaise: number;
  isActive: boolean;
  isPublished: boolean;
  features: string[];
  badgeText: string | null;
  isPopular: boolean;
  accentColor: PlanAccentColor;
  days?: PlanDay[];
}

export interface PlanInput {
  name: string;
  description?: string;
  durationDays: number;
  priceInPaise: number;
  isActive?: boolean;
  features?: string[];
  badgeText?: string;
  isPopular?: boolean;
  accentColor?: PlanAccentColor;
}

export interface PlanSlotInput {
  slotType: MealSlotType;
  mealId?: string;
}

export interface PlanDayInput {
  dayNumber: number;
  slots: PlanSlotInput[];
}

export interface AdminSubscription {
  id: string;
  planId: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  priceInPaiseSnapshot: number;
  planNameSnapshot: string;
  couponCode: string | null;
  bonusDaysGranted: number;
  startDate: string | null;
  cycleEnd: string | null;
  createdAt: string;
  plan: { name: string };
  user: { firstName: string; lastName: string | null; email: string };
}

export interface SubscriptionSettings {
  isAcceptingNewSubscriptions: boolean;
  closureReason: string | null;
  noticeHoursBeforeDelivery: number;
}

export interface TodaysDeliveries {
  date: string;
  prepSheet: { mealName: string; quantity: number }[];
  dispatch: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    planName: string;
    address: string;
    deliverySlotName: string;
    deliveryWindowStart: string;
    deliveryWindowEnd: string;
    meals: string[];
  }[];
}

export function listPlansAdmin(params: { page?: number; limit?: number } = {}): Promise<{
  data: Plan[];
  meta?: PaginationMeta;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return proxyFetchPaginated<Plan[]>(`/subscriptions/plans/admin${qs ? `?${qs}` : ""}`);
}

export function getPlanAdmin(id: string): Promise<Plan> {
  return proxyFetch<Plan>(`/subscriptions/plans/admin/${id}`);
}

export function createPlan(input: PlanInput): Promise<Plan> {
  return proxyFetch<Plan>("/subscriptions/plans", { method: "POST", body: JSON.stringify(input) });
}

export function updatePlan(id: string, input: Partial<PlanInput>): Promise<Plan> {
  return proxyFetch<Plan>(`/subscriptions/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function replacePlanDays(id: string, days: PlanDayInput[]): Promise<Plan> {
  return proxyFetch<Plan>(`/subscriptions/plans/${id}/days`, {
    method: "PUT",
    body: JSON.stringify({ days }),
  });
}

export function publishPlan(id: string, isPublished: boolean): Promise<Plan> {
  return proxyFetch<Plan>(`/subscriptions/plans/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ isPublished }),
  });
}

export function deletePlan(id: string): Promise<void> {
  return proxyFetch<void>(`/subscriptions/plans/${id}`, { method: "DELETE" });
}

export function listSubscriptionsAdmin(params: { page?: number; limit?: number } = {}): Promise<{
  data: AdminSubscription[];
  meta?: PaginationMeta;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return proxyFetchPaginated<AdminSubscription[]>(`/subscriptions/admin${qs ? `?${qs}` : ""}`);
}

export function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  return proxyFetch<SubscriptionSettings>("/subscriptions/settings");
}

export function updateSubscriptionSettings(
  input: Partial<SubscriptionSettings>,
): Promise<SubscriptionSettings> {
  return proxyFetch<SubscriptionSettings>("/subscriptions/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getTodaysDeliveries(): Promise<TodaysDeliveries> {
  return proxyFetch<TodaysDeliveries>("/subscriptions/admin/today");
}
