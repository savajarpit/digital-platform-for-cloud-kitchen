import { API_URL } from "@/lib/config/env";
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
  themeConfig: ThemeConfig;
  defaultLocale: string;
  currency: string;
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
};

/**
 * Fetched server-side on every request (never cached — branding differs per
 * tenant/domain once Phase 0.5 domain resolution lands). Falls back to a
 * neutral default rather than failing the whole page if the backend or a
 * given tenant's business profile isn't reachable/configured yet.
 */
export async function getPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await fetch(`${API_URL}/settings/public-config`, {
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT_PUBLIC_CONFIG;

    const body = (await res.json()) as ApiResponse<PublicConfig>;
    return body.data ?? DEFAULT_PUBLIC_CONFIG;
  } catch {
    return DEFAULT_PUBLIC_CONFIG;
  }
}
