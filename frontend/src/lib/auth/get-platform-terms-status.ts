import { cookies, headers } from "next/headers";
import { API_URL } from "@/lib/config/env";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies";
import type { ApiResponse } from "@/lib/api/response";
import type { MyPlatformTermsStatus } from "@/lib/api/platform-terms";

/**
 * Server Component-only, used by the /admin layout to redirect an OWNER
 * whose PlatformTermsAcceptance is stale — mirrors getSession's own
 * one-shot, no-refresh-on-401 fetch pattern (see that file for why).
 */
export async function getPlatformTermsStatus(): Promise<MyPlatformTermsStatus | null> {
  const [cookieStore, incomingHeaders] = await Promise.all([cookies(), headers()]);
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_URL}/platform-terms/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Tenant-Domain": incomingHeaders.get("host") ?? "localhost",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ApiResponse<MyPlatformTermsStatus>;
    return body.data ?? null;
  } catch {
    return null;
  }
}
