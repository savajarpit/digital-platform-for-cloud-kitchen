import { headers } from "next/headers";

/**
 * The tenant's own public origin for the request currently being rendered —
 * same Host-header source `server-fetch.ts` forwards as `X-Tenant-Domain`,
 * just also resolved into a full origin URL for metadataBase/canonical/OG
 * tags, robots.txt, and sitemap.xml, all of which need an absolute URL.
 */
export async function getSiteOrigin(): Promise<{ host: string; origin: string }> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host") ?? "localhost";
  const hostname = host.split(":")[0];
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const proto = incomingHeaders.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return { host, origin: `${proto}://${host}` };
}
