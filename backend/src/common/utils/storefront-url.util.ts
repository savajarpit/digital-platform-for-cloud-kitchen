export interface StorefrontUrlConfig {
  platformRootDomain?: string;
  /** Fallback when the tenant has neither a custom domain nor a root domain
   * to hang a subdomain on — local dev (localhost:3001). */
  frontendUrl: string;
}

/**
 * The origin a tenant's customers actually use — links in customer emails
 * (reset password, account invite) must land on the kitchen's own
 * storefront, not the platform console, or the customer can't log in there.
 * Mirrors TenantResolverService's lookup order: custom domain, then
 * {slug}.{platformRootDomain}, then the dev fallback.
 */
export function buildStorefrontOrigin(
  tenant: { slug: string; customDomain: string | null },
  config: StorefrontUrlConfig,
): string {
  if (tenant.customDomain) return `https://${tenant.customDomain}`;
  if (config.platformRootDomain) {
    return `https://${tenant.slug}.${config.platformRootDomain}`;
  }
  return config.frontendUrl.replace(/\/+$/, '');
}
