import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformPlansService } from './platform-plans.service';
import { UpsertPlatformPlanDto } from './dto/upsert-platform-plan.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('platform-plans')
@Controller({ path: 'platform-plans', version: '1' })
export class PlatformPlansController {
  constructor(private readonly platformPlansService: PlatformPlansService) {}

  @Public()
  @Get()
  @ResponseMessage('Plans retrieved successfully')
  @ApiOperation({
    summary:
      'Public: published SaaS pricing tiers, for the (separate, not-yet-built) marketing site',
  })
  findPublished() {
    return this.platformPlansService.findPublished();
  }

  @Get('my-upgrades')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Eligible plans retrieved successfully')
  @ApiOperation({
    summary:
      'The plans this tenant could self-serve switch to right now, filtered to what actually fits their current usage',
  })
  getMyEligiblePlans(@CurrentTenantId() tenantId: string) {
    return this.platformPlansService.getEligiblePlansForTenant(tenantId);
  }

  @Get('admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plans retrieved successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: every plan, published or not' })
  findAllAdmin() {
    return this.platformPlansService.findAllAdmin();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan created successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: create a pricing tier' })
  create(@Body() dto: UpsertPlatformPlanDto) {
    return this.platformPlansService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan updated successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: update a pricing tier' })
  update(@Param('id') id: string, @Body() dto: UpsertPlatformPlanDto) {
    return this.platformPlansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: delete a pricing tier' })
  async delete(@Param('id') id: string) {
    await this.platformPlansService.delete(id);
  }
}
