import { ApiError, proxyFetch, proxyFetchPaginated } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/response";
import type { CancelRefundInput, Refund } from "@/lib/api/refunds";

export { ApiError };
export type { CancelRefundInput, Refund } from "@/lib/api/refunds";

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

// WEEKLY_FIXED only — governs an "off day" (a real weekday with no decided
// meals anywhere on the plan). LOSS_DELIVERY (default) — off days eat into
// the paid durationDays. EXTEND_TO_COMPENSATE — the schedule stretches past
// off days so every subscriber still gets exactly durationDays deliveries.
export type OffDayHandling = "LOSS_DELIVERY" | "EXTEND_TO_COMPENSATE";

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
  offDayHandling: OffDayHandling;
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
  offDayHandling?: OffDayHandling;
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
  reason: string | null;
  disruptionId: string | null;
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
  userId: string;
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
  cancelledAt: string | null;
  cancellationReason: string | null;
  refunds: Refund[];
  paymentMethod: "RAZORPAY" | "CASH" | "UPI";
  createdByUserId: string | null;
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

export interface PlanCyclePreview {
  startDate: string;
  cycleEnd: string;
  durationDays: number;
  calendarSpanDays: number;
}

/** Projects a brand-new subscriber's start/end dates right now, given the
 * plan's currently-SAVED schedule config — the only way to see
 * EXTEND_TO_COMPENSATE's effect without a real test signup. Reflects the
 * last-saved meal plan, not unsaved edits still in the grid. */
export function getPlanCyclePreview(id: string): Promise<PlanCyclePreview> {
  return proxyFetch<PlanCyclePreview>(`/subscriptions/plans/admin/${id}/cycle-preview`);
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

export interface CreateManualSubscriptionInput {
  customerUserId: string;
  planId: string;
  addressId: string;
  couponCode?: string;
  deliverySlotId?: string;
  paymentMethod: "CASH" | "UPI";
}

/** Admin phone-signup path — creates the subscription settled by cash/UPI,
 * no Razorpay involved. Lands PENDING_PAYMENT; markSubscriptionPaid() is
 * the separate call that actually activates it. */
export function createManualSubscription(
  input: CreateManualSubscriptionInput,
): Promise<{ subscription: AdminSubscriptionDetail }> {
  return proxyFetch<{ subscription: AdminSubscriptionDetail }>("/subscriptions/admin", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function markSubscriptionPaid(id: string): Promise<AdminSubscriptionDetail> {
  return proxyFetch<AdminSubscriptionDetail>(`/subscriptions/admin/${id}/mark-paid`, {
    method: "POST",
  });
}

// ── Act on behalf of a customer (e.g. they called in) ───────

export function skipDayAdmin(id: string, date: string): Promise<AdminSubscriptionDetail> {
  return proxyFetch<AdminSubscriptionDetail>(`/subscriptions/admin/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export function pauseAdmin(
  id: string,
  dateFrom: string,
  dateTo: string,
): Promise<AdminSubscriptionDetail> {
  return proxyFetch<AdminSubscriptionDetail>(`/subscriptions/admin/${id}/pause`, {
    method: "POST",
    body: JSON.stringify({ dateFrom, dateTo }),
  });
}

export function setDayOverrideAdmin(
  id: string,
  input: { date: string; addressId?: string; deliverySlotId?: string; note?: string },
): Promise<SubscriptionDayOverride> {
  return proxyFetch<SubscriptionDayOverride>(`/subscriptions/admin/${id}/day-override`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface RefundPreview {
  durationDaysSnapshot: number;
  deliveredDays: number;
  pendingDays: number;
  priceInPaiseSnapshot: number;
  suggestedAmountInPaise: number;
  razorpayRefundAvailable: boolean;
}

/** Suggested refund amount, prorated on undelivered days — a starting point
 * for the cancel-refund form, not the final submitted amount. */
export function getRefundPreview(id: string): Promise<RefundPreview> {
  return proxyFetch<RefundPreview>(`/subscriptions/admin/${id}/refund-preview`);
}

export function cancelSubscriptionRefund(
  id: string,
  input: CancelRefundInput,
): Promise<{ subscription: AdminSubscriptionDetail; refund: Refund }> {
  return proxyFetch<{ subscription: AdminSubscriptionDetail; refund: Refund }>(
    `/subscriptions/admin/${id}/cancel-refund`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// ── Analytics ────────────────────────────────────────────

export interface SubscriptionAnalytics {
  newSubscribersToday: number;
  newSubscribersInRange: number;
  activeSubscribers: number;
  grossRevenueInPaise: number;
  refundedInPaise: number;
  netRevenueInPaise: number;
  revenueTrend: { date: string; count: number; valueInPaise: number }[];
  planBreakdown: {
    planId: string;
    planName: string;
    subscriberCount: number;
    revenueInPaise: number;
  }[];
}

export function getSubscriptionAnalytics(params: {
  days?: number;
  from?: string;
  to?: string;
  planId?: string;
}): Promise<SubscriptionAnalytics> {
  const search = new URLSearchParams();
  if (params.from && params.to) {
    search.set("from", params.from);
    search.set("to", params.to);
  } else if (params.days) {
    search.set("days", String(params.days));
  }
  if (params.planId) search.set("planId", params.planId);
  const qs = search.toString();
  return proxyFetch<SubscriptionAnalytics>(`/subscriptions/admin/analytics${qs ? `?${qs}` : ""}`);
}

export interface ExpiringSoonSubscription {
  id: string;
  planName: string;
  cycleEnd: string;
  user: { firstName: string; lastName: string | null; email: string };
}

export interface ExpiringSoon {
  count: number;
  subscriptions: ExpiringSoonSubscription[];
}

export function getExpiringSoon(withinDays: number): Promise<ExpiringSoon> {
  return proxyFetch<ExpiringSoon>(`/subscriptions/admin/analytics/expiring?withinDays=${withinDays}`);
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

// ── Tenant-declared disruptions (heavy rain, an emergency) ──────────

export interface SubscriptionDisruption {
  id: string;
  planId: string | null;
  date: string;
  reason: string;
  compensationDays: number;
  createdAt: string;
  plan: { name: string } | null;
  _count: { skips: number };
}

export interface DeclareDisruptionInput {
  date: string;
  reason: string;
  compensationDays?: number;
  scope: "SINGLE" | "PLAN";
  subscriptionId?: string;
  planId?: string;
}

export function declareDisruption(
  input: DeclareDisruptionInput,
): Promise<SubscriptionDisruption> {
  return proxyFetch<SubscriptionDisruption>("/subscriptions/admin/disruptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listDisruptions(params: { page?: number; limit?: number } = {}): Promise<{
  data: SubscriptionDisruption[];
  meta?: PaginationMeta;
}> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return proxyFetchPaginated<SubscriptionDisruption[]>(
    `/subscriptions/admin/disruptions${qs ? `?${qs}` : ""}`,
  );
}
