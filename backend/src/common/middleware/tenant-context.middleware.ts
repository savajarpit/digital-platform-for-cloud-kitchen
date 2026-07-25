import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { TenantResolverService } from '../services/tenant-resolver.service';

/**
 * Runs before auth/guards on every request and resolves which tenant is
 * being served, attaching it as `req.tenantContext`. This is what lets one
 * shared deployment serve every client's own domain.
 *
 * The frontend (which may be deployed on entirely different infrastructure
 * from this backend) resolves the tenant from the browser's request and
 * forwards it explicitly via `X-Tenant-Domain` — a raw `Host` header on this
 * server-to-server call would only ever be this backend's own host, not the
 * tenant's public domain. `Host` is still used as a fallback for local dev
 * and for hitting the backend directly (health checks, Swagger, etc.).
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantResolver: TenantResolverService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const host =
        (req.headers['x-tenant-domain'] as string | undefined) ??
        req.headers.host ??
        'localhost';
      const hostname = host.split(':')[0].toLowerCase();

      const platformAdminHost = this.config.get<string>(
        'app.platformAdminHost',
      );
      if (platformAdminHost && hostname === platformAdminHost.toLowerCase()) {
        // Platform console traffic isn't tied to any single tenant —
        // SUPER_ADMIN-only routes select a tenant explicitly instead.
        next();
        return;
      }

      req.tenantContext = await this.tenantResolver.resolveByHost(hostname);
      next();
    } catch (error) {
      next(error);
    }
  }
}
