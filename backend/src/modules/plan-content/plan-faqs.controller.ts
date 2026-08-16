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
import { UpsertPlanFaqDto } from './dto/upsert-plan-faq.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('plan-faqs')
@Controller({ path: 'plan-faqs', version: '1' })
export class PlanFaqsController {
  constructor(private readonly service: PlanContentService) {}

  @Public()
  @Get()
  @ResponseMessage('Plan FAQs retrieved successfully')
  @ApiOperation({ summary: 'Public: FAQ accordion for the /plans page' })
  findPublished(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.service.findPublishedFaqs(tenantId);
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan FAQs retrieved successfully')
  @ApiOperation({ summary: 'Admin: every FAQ, published or not' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.service.findAllFaqsForAdmin(tenantId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan FAQ added successfully')
  @ApiOperation({ summary: 'Admin: add an FAQ item' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: UpsertPlanFaqDto) {
    return this.service.createFaq(tenantId, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan FAQ updated successfully')
  @ApiOperation({ summary: 'Admin: edit/publish/unpublish an FAQ item' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPlanFaqDto,
  ) {
    return this.service.updateFaq(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('subscriptions.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete an FAQ item' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.service.deleteFaq(tenantId, id);
  }
}
