import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Status } from '../../generated/prisma';

export interface ResolvedTenant {
  id: string;
  status: Status;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

/**
 * Single seam for resolving "the current tenant" from an inbound request.
 * This is the one place that changed when the platform moved from a
 * single-tenant-per-deployment model to shared multi-tenant hosting — every
 * other module always calls through here, never a hardcoded tenant id.
 */
@Injectable()
export class TenantResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * @param host The raw `Host` request header (may include a port, e.g. `localhost:3001`).
   */
  async resolveByHost(host: string): Promise<ResolvedTenant> {
    const hostname = host.split(':')[0].toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { customDomain: hostname },
      select: { id: true, status: true },
    });
    if (tenant) return tenant;

    // No custom domain mapped to this exact host. A tenant that hasn't set
    // one up yet is still reachable at {slug}.{platformRootDomain} — every
    // tenant gets this the moment they're created, no DNS work required per
    // tenant (one wildcard record covers all of them).
    const rootDomain = this.config
      .get<string>('app.platformRootDomain')
      ?.toLowerCase();
    if (rootDomain && hostname !== rootDomain && hostname.endsWith(`.${rootDomain}`)) {
      const slug = hostname.slice(0, hostname.length - rootDomain.length - 1);
      const bySlug = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });
      if (bySlug) return bySlug;
      throw new NotFoundException(`No tenant is configured for "${slug}"`);
    }

    // In local dev (or before a tenant sets up their domain/root-domain
    // config) fall back to the sole provisioned tenant rather than failing
    // outright — matches Phase 0's single-tenant seed.
    if (LOCAL_HOSTNAMES.has(hostname)) {
      return this.resolveSoleTenant();
    }

    throw new NotFoundException(
      `No tenant is configured for host "${hostname}"`,
    );
  }

  private async resolveSoleTenant(): Promise<ResolvedTenant> {
    const tenant = await this.prisma.tenant.findFirst({
      select: { id: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!tenant) {
      throw new NotFoundException('No tenant provisioned for this deployment');
    }
    return tenant;
  }
}
