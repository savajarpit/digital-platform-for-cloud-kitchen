import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

/** SUPER_ADMIN-only, platform-wide technical toggles — apply to every
 * tenant at once, unlike Feature/TenantFeature (per-tenant entitlements). */
@ApiTags('platform-settings')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN)
@Controller({ path: 'platform/settings', version: '1' })
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  @ResponseMessage('Platform settings retrieved successfully')
  @ApiOperation({ summary: 'The platform-wide technical toggles' })
  get() {
    return this.service.getSettings();
  }

  @Patch()
  @ResponseMessage('Platform settings updated successfully')
  @ApiOperation({ summary: 'Update a platform-wide technical toggle' })
  update(
    @Body() dto: UpdatePlatformSettingsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.update(dto, userId);
  }
}
