import { cookies, headers } from "next/headers";
import { API_URL } from "@/lib/config/env";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies";
import type { ApiResponse } from "@/lib/api/response";

export interface Session {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
}

/**
 * Server Component-only session read, for route-group layouts that need to
 * gate on role before rendering anything (e.g. `/admin`). Deliberately does
 * not attempt a refresh-on-401 like the client proxy does — a Server
 * Component render is a one-shot; an expired token here just means "treat
 * as logged out," and the client-side proxy will refresh on the next
 * client-side call anyway.
 */
export async function getSession(): Promise<Session | null> {
  const [cookieStore, incomingHeaders] = await Promise.all([cookies(), headers()]);
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Tenant-Domain": incomingHeaders.get("host") ?? "localhost",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ApiResponse<Session>;
    return body.data ?? null;
  } catch {
    return null;
  }
}
