import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_PLATFORM_TERMS_KEY } from '../decorators/skip-platform-terms.decorator';
import { Role } from '../enums/role.enum';
import { PlatformTermsService } from '../../modules/platform-terms/platform-terms.service';

/**
 * A tenant can be ACTIVE (paid) but still owe re-consent after Arpit updates
 * his platform terms — separate from TenantStatusGuard, this is a consent
 * gate, not a payment gate. Only OWNER is gated: they're who's charged for
 * the platform and who accepted PlatformTerms in the first place; STAFF
 * never sees or signs it, SUPER_ADMIN authors it.
 */
@Injectable()
export class PlatformTermsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformTermsService: PlatformTermsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PLATFORM_TERMS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user || user.role !== Role.OWNER) return true;

    const tenantId = req.tenantId ?? user.tenantId;
    if (!tenantId) return true;

    const compliant = await this.platformTermsService.isCompliant(
      tenantId,
      user.userId,
    );
    if (!compliant) {
      throw new ForbiddenException(
        'Please review and accept the latest platform terms to continue.',
      );
    }
    return true;
  }
}
