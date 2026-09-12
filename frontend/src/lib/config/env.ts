/** Server-only base URL — used by Server Components and Route Handlers. */
export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";

/** Browser-safe base URL — used by Client Components. */
export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/** The platform's own shared domain — a tenant with no customDomain yet is
 * reachable at {slug}.{PLATFORM_ROOT_DOMAIN}. Must match the backend's
 * PLATFORM_ROOT_DOMAIN (see TenantResolverService). Undefined until set. */
export const PLATFORM_ROOT_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;

// Which map provider renders (Google vs OSM/Leaflet) and the Google Maps
// API key are no longer build-time env vars — both are SUPER_ADMIN-managed
// platform settings (Platform settings → Maps), fetched at runtime via
// getPublicConfig()/fetchPublicConfig() so a switch takes effect
// immediately for every tenant, with no rebuild/redeploy. See
// PlatformSettingsCard.tsx and components/maps/LocationPickerMap.tsx.
