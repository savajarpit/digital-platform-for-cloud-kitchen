import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantLimitsService } from './tenant-limits.service';
import { SettingsRepository } from '../settings/settings.repository';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('tenant-limits')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
@Controller({ path: 'tenant-limits', version: '1' })
export class TenantLimitsController {
  constructor(
    private readonly tenantLimitsService: TenantLimitsService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  @Get('me')
  @ResponseMessage('Usage summary retrieved successfully')
  @ApiOperation({
    summary:
      "This tenant's own order/subscriber usage vs. its plan limits — backs the near-limit/hit-limit banner in the tenant's own admin",
  })
  async getMyUsage(@CurrentTenantId() tenantId: string) {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return this.tenantLimitsService.getUsageSummary(
      tenantId,
      profile?.timezone ?? 'Asia/Kolkata',
    );
  }
}
