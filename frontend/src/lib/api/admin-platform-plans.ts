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

export interface EligiblePlansResponse {
  currentPlanId: string | null;
  currentAmountInPaise: number;
  plans: EligiblePlan[];
}

export function getMyEligiblePlans(): Promise<EligiblePlansResponse> {
  return proxyFetch<EligiblePlansResponse>("/platform-plans/my-upgrades");
}

export function switchPlatformPlan(planId: string): Promise<{ scheduled: boolean }> {
  return proxyFetch<{ scheduled: boolean }>(`/platform/plans/${planId}/switch`, { method: "POST" });
}
