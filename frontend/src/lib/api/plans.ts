import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export type PlanAccentColor = "PRIMARY" | "SECONDARY" | "ACCENT";

export interface PlanActivePromotion {
  promotionName: string;
  discountPercentage: number;
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  priceInPaise: number;
  features: string[];
  badgeText: string | null;
  isPopular: boolean;
  accentColor: PlanAccentColor;
  activePromotion?: PlanActivePromotion | null;
}

/** Server-side only — published curated plans for the storefront `/plans` list. */
export async function getPublishedPlans(): Promise<PublicPlan[]> {
  try {
    const res = await serverFetch("/subscriptions/plans");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicPlan[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}

export interface PlansHomeSettings {
  showOnHomepage: boolean;
  homepageTitle: string;
  homepageDescription?: string;
  plansPageTitle: string;
  plansPageSubtitle: string;
  whySubscribeEnabled: boolean;
  faqEnabled: boolean;
  contactCtaEnabled: boolean;
  contactCtaTitle: string;
  contactCtaDescription: string;
  contactEmail?: string;
}

const DEFAULT_PLANS_HOME_SETTINGS: PlansHomeSettings = {
  showOnHomepage: true,
  homepageTitle: "Meal Plans",
  plansPageTitle: "Choose Your Plan",
  plansPageSubtitle:
    "Flexible subscription plans that adapt to your routine. Skip, pause, or cancel — no lock-in, ever.",
  whySubscribeEnabled: true,
  faqEnabled: true,
  contactCtaEnabled: true,
  contactCtaTitle: "Still have questions?",
  contactCtaDescription: "Our team is happy to help you find the right plan.",
};

/**
 * Server-side only — the home "Meal Plans" block's copy/toggle plus the
 * /plans page's own header + extra-section config. One endpoint backs both.
 */
export async function getPlansHomeSettings(): Promise<PlansHomeSettings> {
  try {
    const res = await serverFetch("/subscriptions/settings/public");
    if (!res.ok) return DEFAULT_PLANS_HOME_SETTINGS;
    const body = (await res.json()) as ApiResponse<PlansHomeSettings>;
    return body.data ?? DEFAULT_PLANS_HOME_SETTINGS;
  } catch {
    return DEFAULT_PLANS_HOME_SETTINGS;
  }
}

export interface PublicPlanFeature {
  id: string;
  icon: string;
  title: string;
  description: string | null;
}

/** Server-side only — "Why subscribe?" cards for the /plans page. */
export async function getPlanFeatures(): Promise<PublicPlanFeature[]> {
  try {
    const res = await serverFetch("/plan-features");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicPlanFeature[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}

export interface PublicPlanFaq {
  id: string;
  question: string;
  answer: string;
}

/** Server-side only — FAQ accordion for the /plans page. */
export async function getPlanFaqs(): Promise<PublicPlanFaq[]> {
  try {
    const res = await serverFetch("/plan-faqs");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicPlanFaq[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}
