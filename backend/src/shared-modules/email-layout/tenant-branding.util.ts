import { PrismaService } from '../../database/prisma/prisma.service';

export interface TenantEmailBranding {
  businessName: string;
  logoUrl: string | null;
  showPoweredBy: boolean;
}

/** Shared by MailService and NotificationsService — a tenant's own Business
 * Profile identity + SUPER_ADMIN's per-tenant "powered by" flag, the
 * branding every customer-facing send (welcome, reset-password, OTP, order
 * confirmation, subscription-disruption) wraps its content in. Falls back
 * to the raw Tenant name if the profile isn't set up yet. */
export async function getTenantEmailBranding(
  prisma: PrismaService,
  tenantId: string,
): Promise<TenantEmailBranding> {
  const [profile, tenant] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { tenantId },
      select: { displayName: true, logoUrl: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, poweredByBrandingEnabled: true },
    }),
  ]);
  return {
    businessName: profile?.displayName ?? tenant?.name ?? 'Your account',
    logoUrl: profile?.logoUrl ?? null,
    showPoweredBy: tenant?.poweredByBrandingEnabled ?? true,
  };
}
