import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums/role.enum';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return true;

    const paramTenantId = req.params?.tenantId;
    if (paramTenantId && paramTenantId !== req.user.tenantId) {
      if (req.user.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('Cross-tenant access denied');
      }
    }

    req.tenantId = req.user.tenantId;
    return true;
  }
}
