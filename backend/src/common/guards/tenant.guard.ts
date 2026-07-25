import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../enums/role.enum';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const domainTenantId = req.tenantContext?.id;

    if (!req.user) {
      req.tenantId = domainTenantId;
      return true;
    }

    // A JWT issued for one tenant must never be usable against another
    // tenant's domain — this is the check that makes shared hosting safe.
    if (
      req.user.role !== Role.SUPER_ADMIN &&
      req.user.tenantId !== domainTenantId
    ) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    const paramTenantId = req.params?.tenantId as string | undefined;
    if (paramTenantId && paramTenantId !== req.user.tenantId) {
      if (req.user.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    req.tenantId =
      req.user.role === Role.SUPER_ADMIN
        ? (paramTenantId ?? req.user.tenantId)
        : req.user.tenantId;
    return true;
  }
}
