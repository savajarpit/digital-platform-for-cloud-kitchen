import { ApiError, proxyFetch } from "@/lib/api/client";
import type { Address } from "@/lib/api/addresses";
import type { DeliverySlot } from "@/lib/api/delivery-slots";

export { ApiError };

export type MealSlotType = "BREAKFAST" | "LUNCH" | "DINNER";

export interface PlanSlot {
  id: string;
  slotType: MealSlotType;
  mealId: string | null;
  meal: {
    id: string;
    name: string;
    imageUrl: string | null;
    priceInPaise: number;
  } | null;
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
  meals: {
    slotType: MealSlotType;
    mealId: string | null;
    name: string | null;
    imageUrl: string | null;
  }[];
}

export type PlanCalendarDayKind = "DELIVERY" | "OFF_DAY" | "HOLIDAY";

export interface PlanCalendarDay {
  /** YYYY-MM-DD, tenant-local. */
  date: string;
  kind: PlanCalendarDayKind;
  /** HOLIDAY only — the closure's customer-visible name and note. */
  holiday: { name: string | null; note: string | null } | null;
  /** RELATIVE_DAY plans only, e.g. "Day 3". */
  dayLabel: string | null;
  /** Empty for OFF_DAY and HOLIDAY. */
  meals: PlanPreviewDay["meals"];
}

/** Every date a new subscriber would span, classified — see the backend's buildPlanCalendar. */
export interface PlanCalendar {
  startDate: string;
  endDate: string;
  days: PlanCalendarDay[];
}

export type PlanViewMode = "ACCORDION" | "CALENDAR" | "BOTH";

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
  /** How the tenant shows this menu — always ACCORDION unless they have the calendar feature and chose otherwise. */
  viewMode: PlanViewMode;
  /** Set only when viewMode is CALENDAR or BOTH. */
  calendar: PlanCalendar | null;
  timeSelectionEnabled: boolean;
  activePromotion?: {
    promotionName: string;
    discountPercentage: number;
  } | null;
  /** Set only when the tenant has delivery date selection enabled — the
   * customer must choose exactly `requiredCount` dates from `candidates`
   * before subscribing. Null means signup works as before (no picker). */
  dateSelection: PlanDateSelection | null;
}

export interface PlanDateSelection {
  requiredCount: number;
  /** Every pickable delivery date (YYYY-MM-DD), holidays/off-days already excluded, ascending. */
  candidates: string[];
  /** The window's non-pickable dates and why — shown like the browsing calendar shows them. */
  unavailable: {
    date: string;
    kind: "HOLIDAY" | "OFF_DAY";
    holiday: { name: string | null; note: string | null } | null;
  }[];
  /** True for a short plan (customer actively picks every date). False for a
   * long plan (everything is pre-selected; the customer only edits exceptions). */
  manualSelection: boolean;
  /** WEEKLY_FIXED only — each candidate's menu (fixed by its calendar date).
   * Null for RELATIVE_DAY, whose menu depends on a date's position in the
   * final selection and is derived from the plan's own days instead. */
  mealsByDate: Record<string, PlanPreviewDay["meals"]> | null;
}

export interface UpcomingPreviewDay {
  date: string;
  skipped: boolean;
  meals: {
    slotType: MealSlotType;
    mealId: string | null;
    name: string | null;
    imageUrl: string | null;
  }[];
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

export type SubscriptionDayKind =
  | "DELIVERED"
  | "UPCOMING"
  | "SKIPPED"
  | "DISRUPTED"
  | "HOLIDAY"
  | "OFF_DAY"
  | "NOT_SCHEDULED";

export interface SubscriptionCalendarDay {
  date: string;
  kind: SubscriptionDayKind;
  /** RELATIVE_DAY plans only, e.g. "Day 3". */
  dayLabel: string | null;
  meals: UpcomingPreviewDay["meals"];
  addressId: string;
  deliverySlotId: string | null;
  isOverridden: boolean;
  note: string | null;
  /** DISRUPTED/HOLIDAY only — the tenant's reason/name for that day. */
  reason: string | null;
  locked: boolean;
}

export interface SubscriptionDetail extends SubscriptionSummary {
  addressId: string;
  deliverySlotId: string | null;
  plan: SubscriptionSummary["plan"] & { durationDays: number; days: PlanDay[] };
  skips: { dateFrom: string; dateTo: string; bankedDays: number }[];
  dayOverrides: {
    date: string;
    addressId: string | null;
    deliverySlotId: string | null;
  }[];
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
  /** How this subscription's calendar is shown — same tenant setting as the storefront plan page. */
  viewMode: PlanViewMode;
  /** True only for a usesDateSelection subscriber whose tenant has "allow date changes after purchase" on. */
  canMoveDates: boolean;
  /** The subscription's full lifetime (past and future), used by the calendar view. */
  calendar: SubscriptionCalendarDay[];
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
  return proxyFetch<{ isEnabled: boolean }>(
    "/subscriptions/settings/public",
  ).then((settings) => settings.isEnabled);
}

export function subscribe(input: {
  planId: string;
  addressId: string;
  couponCode?: string;
  deliverySlotId?: string;
  /** Required (exactly plan.dateSelection.requiredCount) only when the plan came back with dateSelection set. */
  deliveryDates?: string[];
}): Promise<{
  subscriptionId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountInPaise: number;
}> {
  return proxyFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export function getSubscriptionInvoice(id: string): Promise<{
  invoice: SubscriptionInvoice;
  subscription: SubscriptionForInvoice;
}> {
  return proxyFetch(`/subscriptions/mine/${id}/invoice`);
}

export function skipDay(
  id: string,
  date: string,
): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/skip`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export function pauseSubscription(
  id: string,
  dateFrom: string,
  dateTo: string,
): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/pause`, {
    method: "POST",
    body: JSON.stringify({ dateFrom, dateTo }),
  });
}

export function setDayOverride(
  id: string,
  input: {
    date: string;
    addressId?: string;
    deliverySlotId?: string;
    note?: string;
  },
): Promise<{
  date: string;
  addressId: string | null;
  deliverySlotId: string | null;
  note?: string | null;
}> {
  return proxyFetch(`/subscriptions/mine/${id}/day-override`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelSubscription(id: string): Promise<SubscriptionSummary> {
  return proxyFetch<SubscriptionSummary>(`/subscriptions/mine/${id}/cancel`, {
    method: "POST",
  });
}

/** Valid dates a scheduled delivery could be moved to — only meaningful
 * when SubscriptionDetail.canMoveDates is true. */
export function getMoveCandidates(id: string, date: string): Promise<string[]> {
  return proxyFetch<string[]>(
    `/subscriptions/mine/${id}/move-candidates?date=${encodeURIComponent(date)}`,
  );
}

export function moveDeliveryDate(
  id: string,
  date: string,
  newDate: string,
): Promise<SubscriptionDetail> {
  return proxyFetch<SubscriptionDetail>(`/subscriptions/mine/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ date, newDate }),
  });
}
