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
import { SocialLinksService } from './social-links.service';
import {
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
} from './dto/upsert-social-link.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('social-links')
@Controller({ path: 'social-links', version: '1' })
export class SocialLinksController {
  constructor(private readonly service: SocialLinksService) {}

  @Public()
  @Get()
  @ResponseMessage('Social links retrieved successfully')
  @ApiOperation({ summary: 'Public: enabled social links for the footer' })
  findPublished(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.service.findPublished(tenantId);
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Social links retrieved successfully')
  @ApiOperation({ summary: 'Admin: every social link, enabled or not' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.service.findAllForAdmin(tenantId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Social link added successfully')
  @ApiOperation({ summary: 'Admin: add a social link' })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateSocialLinkDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Social link updated successfully')
  @ApiOperation({ summary: 'Admin: update a social link (url/enabled/order)' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSocialLinkDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: remove a social link' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.service.delete(tenantId, id);
  }
}
