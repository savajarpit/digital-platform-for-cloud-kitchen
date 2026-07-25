import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

/**
 * Single seam for resolving "the current tenant" outside of an authenticated
 * request (e.g. public storefront config). Today this deployment hosts a
 * single tenant, so it returns the one seeded row. When this platform moves
 * to shared multi-tenant SaaS, only this method's body changes (resolve by
 * Host header / custom domain instead) — call sites never do.
 */
@Injectable()
export class TenantResolverService {
  private cachedTenantId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTenantId(): Promise<string> {
    if (this.cachedTenantId) return this.cachedTenantId;

    const tenant = await this.prisma.tenant.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!tenant) {
      throw new NotFoundException('No tenant provisioned for this deployment');
    }

    this.cachedTenantId = tenant.id;
    return tenant.id;
  }
}
