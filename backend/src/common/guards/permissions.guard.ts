import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { Role } from '../enums/role.enum';
import { PermissionsService } from '../../modules/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) return true; // no user on this route — JwtAuthGuard/@Public already decided that

    if (user.role === Role.SUPER_ADMIN) return true;

    const tenantId = req.tenantId ?? user.tenantId;
    if (!tenantId) throw new ForbiddenException('Insufficient permissions');

    const granted = await this.permissionsService.hasPermission(
      tenantId,
      user.role,
      required,
    );
    if (!granted) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
