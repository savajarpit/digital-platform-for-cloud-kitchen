import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface PlanFeature {
  id: string;
  icon: string;
  title: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

export interface PlanFeatureInput {
  icon: string;
  title: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

export function listPlanFeaturesAdmin(): Promise<PlanFeature[]> {
  return proxyFetch<PlanFeature[]>("/plan-features/admin");
}

export function createPlanFeature(input: PlanFeatureInput): Promise<PlanFeature> {
  return proxyFetch<PlanFeature>("/plan-features", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePlanFeature(
  id: string,
  input: Partial<PlanFeatureInput>,
): Promise<PlanFeature> {
  return proxyFetch<PlanFeature>(`/plan-features/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePlanFeature(id: string): Promise<void> {
  return proxyFetch<void>(`/plan-features/${id}`, { method: "DELETE" });
}

export interface PlanFaq {
  id: string;
  question: string;
  answer: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface PlanFaqInput {
  question: string;
  answer: string;
  isPublished?: boolean;
  sortOrder?: number;
}

export function listPlanFaqsAdmin(): Promise<PlanFaq[]> {
  return proxyFetch<PlanFaq[]>("/plan-faqs/admin");
}

export function createPlanFaq(input: PlanFaqInput): Promise<PlanFaq> {
  return proxyFetch<PlanFaq>("/plan-faqs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePlanFaq(id: string, input: Partial<PlanFaqInput>): Promise<PlanFaq> {
  return proxyFetch<PlanFaq>(`/plan-faqs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePlanFaq(id: string): Promise<void> {
  return proxyFetch<void>(`/plan-faqs/${id}`, { method: "DELETE" });
}
