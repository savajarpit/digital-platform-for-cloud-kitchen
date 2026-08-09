import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export type PlanAccentColor = "PRIMARY" | "SECONDARY" | "ACCENT";

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

/** Server-side only — whether the home page's plans block is turned on. */
export async function getShowPlansOnHomepage(): Promise<boolean> {
  try {
    const res = await serverFetch("/subscriptions/settings/public");
    if (!res.ok) return true;
    const body = (await res.json()) as ApiResponse<{ showOnHomepage: boolean }>;
    return body.data?.showOnHomepage ?? true;
  } catch {
    return true;
  }
}
