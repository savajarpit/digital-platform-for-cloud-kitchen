import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { Role } from '../enums/role.enum';
import { FeaturesService } from '../../modules/features/features.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featuresService: FeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) return true; // no user on this route — JwtAuthGuard/@Public already decided that

    if (user.role === Role.SUPER_ADMIN) return true;

    const tenantId = req.tenantId ?? user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException(
        "This feature isn't enabled for your account — contact your platform admin.",
      );
    }

    const enabled = await this.featuresService.hasFeature(tenantId, required);
    if (!enabled) {
      throw new ForbiddenException(
        "This feature isn't enabled for your account — contact your platform admin.",
      );
    }
    return true;
  }
}
