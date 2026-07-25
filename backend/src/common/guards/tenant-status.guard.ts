import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../enums/role.enum';
import { Status } from '../../generated/prisma';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.user?.role === Role.SUPER_ADMIN) return true;

    const tenant = req.tenantContext;
    if (tenant && tenant.status !== Status.ACTIVE) {
      throw new ForbiddenException('This business is not currently active.');
    }
    return true;
  }
}
