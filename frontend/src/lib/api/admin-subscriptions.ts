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
  dayNumber: number | null;
  weekNumber: number | null;
  weekday: number | null;
  slots: PlanSlot[];
}

export type PlanAccentColor = "PRIMARY" | "SECONDARY" | "ACCENT";

// RELATIVE_DAY (default) — days are relative to each subscriber's own start
// date, "Day 1, Day 2...". WEEKLY_FIXED — the menu is pinned to real
// calendar weekdays (and optionally multiple weeks) so every subscriber
// eating on the same real day gets the same dish — batch cooking.
export type SchedulingMode = "RELATIVE_DAY" | "WEEKLY_FIXED";

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
  schedulingMode: SchedulingMode;
  weekCount: number | null;
  scheduleAnchorDate: string | null;
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
  schedulingMode?: SchedulingMode;
  weekCount?: number;
  scheduleAnchorDate?: string;
}

export interface PlanSlotInput {
  slotType: MealSlotType;
  mealId?: string;
}

export interface PlanDayInput {
  dayNumber?: number;
  weekNumber?: number;
  weekday?: number;
  slots: PlanSlotInput[];
}

export interface SubscriptionSkip {
  id: string;
  dateFrom: string;
  dateTo: string;
  bankedDays: number;
}

export interface SubscriptionDayOverride {
  id: string;
  date: string;
  addressId: string | null;
  deliverySlotId: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountInPaise: number;
  status: string;
  createdAt: string;
}

export interface AdminSubscriptionDetail {
  id: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  priceInPaiseSnapshot: number;
  durationDaysSnapshot: number;
  planNameSnapshot: string;
  couponCode: string | null;
  bonusDaysGranted: number;
  startDate: string | null;
  cycleEnd: string | null;
  nextPlanDayNumber: number;
  bankedDays: number;
  createdAt: string;
  plan: Plan;
  skips: SubscriptionSkip[];
  dayOverrides: SubscriptionDayOverride[];
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    contactPhone: string;
    lat: number | null;
    lng: number | null;
  } | null;
  deliverySlot: { name: string; startTime: string; endTime: string } | null;
  user: { firstName: string; lastName: string | null; email: string; phone: string | null };
  invoice: SubscriptionInvoice | null;
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
  isEnabled: boolean;
  isAcceptingNewSubscriptions: boolean;
  closureReason: string | null;
  noticeHoursBeforeDelivery: number;
  startDateLeadDays: number;
  showOnHomepage: boolean;
  homepageTitle?: string | null;
  homepageDescription?: string | null;
  plansPageTitle?: string | null;
  plansPageSubtitle?: string | null;
  whySubscribeEnabled: boolean;
  faqEnabled: boolean;
  contactCtaEnabled: boolean;
  contactCtaTitle?: string | null;
  contactCtaDescription?: string | null;
  contactEmail?: string | null;
}

export interface TodaysDeliveries {
  date: string;
  prepSheet: { mealName: string; quantity: number }[];
  dispatch: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    planName: string;
    address: {
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      pincode: string;
      contactPhone: string;
      lat: number | null;
      lng: number | null;
    };
    deliverySlotName: string;
    deliveryWindowStart: string;
    deliveryWindowEnd: string;
    meals: string[];
    notes: string | null;
  }[];
}

export function listPlansAdmin(params: { page?: number; limit?: number; search?: string } = {}): Promise<{
  data: Plan[];
  meta?: PaginationMeta;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.search) search.set("search", params.search);
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

export function listSubscriptionsAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
  planId?: string;
} = {}): Promise<{
  data: AdminSubscription[];
  meta?: PaginationMeta;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.search) search.set("search", params.search);
  if (params.planId) search.set("planId", params.planId);
  const qs = search.toString();
  return proxyFetchPaginated<AdminSubscription[]>(`/subscriptions/admin${qs ? `?${qs}` : ""}`);
}

export function getAdminSubscription(id: string): Promise<AdminSubscriptionDetail> {
  return proxyFetch<AdminSubscriptionDetail>(`/subscriptions/admin/${id}`);
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

export interface PrepPlan {
  planId: string;
  planName: string;
  schedulingMode: SchedulingMode;
  dayNumber?: number;
  weekNumber?: number;
  weekday?: number;
  label: string;
  subscriberCount: number;
  items: { slotType: MealSlotType; mealName: string; quantity: number }[];
}

/** Projected quantities for a plan's template day = active subscriber count x that day's meals — independent of calendar dates for RELATIVE_DAY plans (subscribers start on staggered days), but for WEEKLY_FIXED plans it's today's real weekday and dayNumber is ignored/omitted. */
export function getPrepPlan(planId: string, dayNumber?: number): Promise<PrepPlan> {
  const qs = new URLSearchParams({ planId });
  if (dayNumber != null) qs.set("dayNumber", String(dayNumber));
  return proxyFetch<PrepPlan>(`/subscriptions/admin/prep-plan?${qs.toString()}`);
}
