import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/get-site-origin";

/** Host-resolved per tenant, same as `sitemap.ts` — see `getSiteOrigin()`. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { origin } = await getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/api",
        "/cart",
        "/checkout",
        "/login",
        "/signup",
        "/reset-password",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
