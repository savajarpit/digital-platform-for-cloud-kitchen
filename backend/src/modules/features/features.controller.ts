import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { FeaturesRepository } from './features.repository';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { SetFeatureDto } from './dto/set-feature.dto';

@ApiTags('features')
@ApiBearerAuth('access-token')
@Controller({ path: 'features', version: '1' })
export class FeaturesController {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly featuresRepo: FeaturesRepository,
  ) {}

  @Get('me')
  @ResponseMessage('Features retrieved successfully')
  @ApiOperation({ summary: "Get the current tenant's enabled feature keys" })
  getMyFeatures(
    @CurrentUser('role') role: Role,
    @CurrentUser('tenantId') tenantId: string | undefined,
  ) {
    return this.featuresService.getMyFeatures(role, tenantId);
  }

  @Get('catalog')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Feature catalog retrieved successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: list every feature that exists in the system',
  })
  getCatalog() {
    return this.featuresRepo.findAllFeatures();
  }

  @Get('tenants/:tenantId')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Tenant feature grants retrieved successfully')
  @ApiOperation({
    summary: "SUPER_ADMIN-only: view a tenant's full feature grant state",
  })
  getTenantFeatures(@Param('tenantId') tenantId: string) {
    return this.featuresService.getTenantFeatureView(tenantId);
  }

  @Put('tenants/:tenantId/:featureKey')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Feature grant updated successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: enable or disable one feature for a tenant',
  })
  setFeature(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: SetFeatureDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.featuresService.setFeature(
      tenantId,
      featureKey,
      dto.enabled,
      userId,
    );
  }
}
