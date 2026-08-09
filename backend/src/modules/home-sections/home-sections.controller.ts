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
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeSectionsService } from './home-sections.service';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import { SetHomeSectionItemsDto } from './dto/set-home-section-items.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('home-sections')
@Controller({ path: 'home-sections', version: '1' })
export class HomeSectionsController {
  constructor(private readonly service: HomeSectionsService) {}

  @Public()
  @Get()
  @ResponseMessage('Home sections retrieved successfully')
  @ApiOperation({
    summary: 'Public: enabled home page sections with their products',
  })
  findPublic(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.service.findPublic(tenantId);
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('menu.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home sections retrieved successfully')
  @ApiOperation({ summary: 'Admin: every home section, enabled or not' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.service.findAllForAdmin(tenantId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @RequirePermission('menu.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home section created successfully')
  @ApiOperation({ summary: 'Admin: create a home page section' })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpsertHomeSectionDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('menu.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home section updated successfully')
  @ApiOperation({ summary: 'Admin: rename/reorder/enable/disable a section' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertHomeSectionDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Put(':id/items')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('menu.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home section products updated successfully')
  @ApiOperation({
    summary: "Admin: replace a section's product list (and their order)",
  })
  setItems(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetHomeSectionItemsDto,
  ) {
    return this.service.setItems(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('menu.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete a home page section' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.service.delete(tenantId, id);
  }
}
