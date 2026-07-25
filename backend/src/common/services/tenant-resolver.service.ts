import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

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

    // No client has this exact domain mapped yet. In local dev (or before a
    // tenant sets up their domain) fall back to the sole provisioned tenant
    // rather than failing outright — matches Phase 0's single-tenant seed.
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
