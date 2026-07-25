import { headers } from "next/headers";
import { API_URL } from "@/lib/config/env";

/**
 * fetch() wrapper for Server Components/Route Handlers calling the backend.
 *
 * The backend may be deployed on entirely different infrastructure from
 * this frontend, so a raw `Host` header on this server-to-server call would
 * only ever be the backend's own host — never the tenant's public domain.
 * Instead we read the *incoming* request's Host (the tenant domain a
 * customer actually visited) and forward it explicitly, matching the
 * backend's `TenantContextMiddleware` (`X-Tenant-Domain`).
 */
export async function serverFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const incomingHeaders = await headers();
  const tenantDomain = incomingHeaders.get("host") ?? "localhost";

  return fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...init?.headers,
      "X-Tenant-Domain": tenantDomain,
    },
  });
}
