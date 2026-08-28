import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type PlatformPlanBillingCycle = "MONTHLY" | "YEARLY";

export interface PlatformPlan {
  id: string;
  name: string;
  priceInPaise: number;
  billingCycle: PlatformPlanBillingCycle;
  defaultMaxOrdersPerMonth: number;
  defaultMaxSubscribers: number;
  isPublished: boolean;
  sortOrder: number;
}

export interface PlatformPlanInput {
  name: string;
  priceInPaise: number;
  billingCycle: PlatformPlanBillingCycle;
  defaultMaxOrdersPerMonth: number;
  defaultMaxSubscribers: number;
  isPublished?: boolean;
  sortOrder?: number;
}

export function listPlatformPlansAdmin(): Promise<PlatformPlan[]> {
  return proxyFetch<PlatformPlan[]>("/platform-plans/admin");
}

export function createPlatformPlan(input: PlatformPlanInput): Promise<PlatformPlan> {
  return proxyFetch<PlatformPlan>("/platform-plans", { method: "POST", body: JSON.stringify(input) });
}

export function updatePlatformPlan(id: string, input: PlatformPlanInput): Promise<PlatformPlan> {
  return proxyFetch<PlatformPlan>(`/platform-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePlatformPlan(id: string): Promise<void> {
  return proxyFetch<void>(`/platform-plans/${id}`, { method: "DELETE" });
}

// ── Tenant-facing self-serve switch ────────────────────────────────

export interface EligiblePlan extends PlatformPlan {
  isUpgrade: boolean;
}

export interface PendingPlanSwitch {
  planName: string;
  changeAt: string | null;
}

export interface EligiblePlansResponse {
  currentPlanId: string | null;
  currentAmountInPaise: number;
  plans: EligiblePlan[];
  pendingSwitch: PendingPlanSwitch | null;
  cancelAtPeriodEnd: boolean;
  cancelsOn: string | null;
}

export function getMyEligiblePlans(): Promise<EligiblePlansResponse> {
  return proxyFetch<EligiblePlansResponse>("/platform-plans/my-upgrades");
}

export interface SwitchPlanCheckout {
  isUpgrade: boolean;
  razorpaySubscriptionId: string;
  razorpayKeyId: string;
  planCode: string;
  amountInPaise: number;
}

/** Step 1 of 2 — creates the replacement Razorpay subscription and returns
 * Checkout details. Razorpay doesn't support an in-place plan change for
 * any real payment method, so every switch goes through a fresh Checkout. */
export function switchPlatformPlan(planId: string): Promise<SwitchPlanCheckout> {
  return proxyFetch<SwitchPlanCheckout>(`/platform/plans/${planId}/switch`, { method: "POST" });
}

export interface VerifySwitchInput {
  planId: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}

/** Step 2 of 2 — call once Checkout's handler fires, with its response.
 * Final once this succeeds — Razorpay has no API to undo a scheduled
 * cancellation, so a downgrade switch cannot be reversed afterward. */
export function verifySwitchPlan(input: VerifySwitchInput): Promise<{ scheduled: boolean }> {
  return proxyFetch<{ scheduled: boolean }>("/platform/plans/switch/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
