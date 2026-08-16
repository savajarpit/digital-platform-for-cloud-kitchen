import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanContentService } from './plan-content.service';
import { UpsertPlanFeatureDto } from './dto/upsert-plan-feature.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('plan-features')
@Controller({ path: 'plan-features', version: '1' })
export class PlanFeaturesController {
  constructor(private readonly service: PlanContentService) {}

  @Public()
  @Get()
  @ResponseMessage('Plan features retrieved successfully')
  @ApiOperation({ summary: 'Public: "Why subscribe?" cards for the /plans page' })
  findEnabled(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.service.findEnabledFeatures(tenantId);
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan features retrieved successfully')
  @ApiOperation({ summary: 'Admin: every plan feature, enabled or not' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.service.findAllFeaturesForAdmin(tenantId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan feature added successfully')
  @ApiOperation({ summary: 'Admin: add a "Why subscribe?" card' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: UpsertPlanFeatureDto) {
    return this.service.createFeature(tenantId, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan feature updated successfully')
  @ApiOperation({ summary: 'Admin: edit/enable/disable a "Why subscribe?" card' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPlanFeatureDto,
  ) {
    return this.service.updateFeature(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete a "Why subscribe?" card' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.service.deleteFeature(tenantId, id);
  }
}
