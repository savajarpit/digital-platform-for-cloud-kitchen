import { parseOrThrow } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";
import type { PublicConfig } from "@/lib/api/settings";

export type { PublicConfig };

// A type-only import of PublicConfig above is erased at compile time, so it
// doesn't pull settings.ts's `next/headers` dependency into client bundles —
// but a *value* import of its DEFAULT_PUBLIC_CONFIG would, so it's
// duplicated here rather than imported.
const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  displayName: "Cloud Kitchen",
  themeConfig: {
    primaryColor: "#16A34A",
    secondaryColor: "#0EA5E9",
    accentColor: "#F59E0B",
  },
  defaultLocale: "en",
  currency: "INR",
  maxAdvanceOrderDays: 2,
  showReviewsOnHomepage: false,
  poweredByBrandingEnabled: true,
  heroImageUrls: [],
  ctaEnabled: true,
};

/**
 * Client Component equivalent of `getPublicConfig` (lib/api/settings.ts) —
 * used where branding is needed inside a "use client" page (e.g. the
 * printable invoice) that can't call `next/headers`. Kept in its own module
 * so client bundles never pull in `server-fetch.ts`'s `next/headers` import
 * transitively. Same graceful fallback on failure.
 */
export async function fetchPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/settings/public-config`, {
      headers: { "X-Tenant-Domain": window.location.host },
    });
    return await parseOrThrow<PublicConfig>(res);
  } catch {
    return DEFAULT_PUBLIC_CONFIG;
  }
}
