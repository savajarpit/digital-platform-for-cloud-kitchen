import type { MetadataRoute } from "next";
import { getPublishedPlans } from "@/lib/api/plans";
import { getPublishedPages } from "@/lib/api/content";
import { getSiteOrigin } from "@/lib/seo/get-site-origin";

/** Host-resolved per tenant, same as every other server-rendered page here —
 * see `getSiteOrigin()`. Uses request-time data (`headers()`), so this is
 * never statically cached across tenants. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ origin }, plans, pages] = await Promise.all([
    getSiteOrigin(),
    getPublishedPlans(),
    getPublishedPages(),
  ]);

  return [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/menu`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/plans`, changeFrequency: "weekly", priority: 0.8 },
    ...plans.map((plan) => ({
      url: `${origin}/plans/${plan.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...pages.map((page) => ({
      url: `${origin}/legal/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
