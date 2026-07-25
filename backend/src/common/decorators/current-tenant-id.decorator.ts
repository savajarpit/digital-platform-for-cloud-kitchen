import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Reads `req.tenantId`, set by `TenantGuard` after cross-checking the JWT
 * against the domain-resolved tenant (and honoring a SUPER_ADMIN's
 * `?tenantId=` override). Use this on authenticated, tenant-scoped
 * mutations — `@CurrentTenant()` reads the raw domain-resolved tenant and
 * doesn't account for that SUPER_ADMIN override.
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.tenantId;
  },
);
