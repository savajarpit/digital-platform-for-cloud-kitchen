/** Server-only base URL — used by Server Components and Route Handlers. */
export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";

/** Browser-safe base URL — used by Client Components. */
export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/** The platform's own shared domain — a tenant with no customDomain yet is
 * reachable at {slug}.{PLATFORM_ROOT_DOMAIN}. Must match the backend's
 * PLATFORM_ROOT_DOMAIN (see TenantResolverService). Undefined until set. */
export const PLATFORM_ROOT_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;

/** Needs the Maps JavaScript API + Places API enabled on the same key.
 * Undefined until set — every map-picker component falls back to a plain
 * manual-entry form instead of crashing when this is missing. */
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
