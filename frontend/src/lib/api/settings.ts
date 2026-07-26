import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface PublicConfig {
  displayName: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  themeConfig: ThemeConfig;
  defaultLocale: string;
  currency: string;
  supportEmail?: string;
  supportPhone?: string;
  addressLine1?: string;
  maxAdvanceOrderDays: number;
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  displayName: "Cloud Kitchen",
  themeConfig: {
    primaryColor: "#16A34A",
    secondaryColor: "#0EA5E9",
    accentColor: "#F59E0B",
  },
  defaultLocale: "en",
  currency: "INR",
  maxAdvanceOrderDays: 2,
};

/**
 * Fetched server-side on every request (never cached — branding differs per
 * tenant/domain, resolved via the visitor's own Host header). Falls back to
 * a neutral default rather than failing the whole page if the backend or a
 * given tenant's business profile isn't reachable/configured yet.
 */
export async function getPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await serverFetch("/settings/public-config");
    if (!res.ok) return DEFAULT_PUBLIC_CONFIG;

    const body = (await res.json()) as ApiResponse<PublicConfig>;
    return body.data ?? DEFAULT_PUBLIC_CONFIG;
  } catch {
    return DEFAULT_PUBLIC_CONFIG;
  }
}
