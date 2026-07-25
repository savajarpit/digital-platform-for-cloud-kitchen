import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantResolverService } from '../services/tenant-resolver.service';

/**
 * Runs before auth/guards on every request and resolves which tenant is
 * being served from the `Host` header, attaching it as `req.tenantContext`.
 * This is what lets one shared deployment serve every client's own domain.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantResolver: TenantResolverService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const host = req.headers.host ?? 'localhost';
      req.tenantContext = await this.tenantResolver.resolveByHost(host);
      next();
    } catch (error) {
      next(error);
    }
  }
}
