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
import { ContentService } from './content.service';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('content')
@Controller({ path: 'pages', version: '1' })
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Public()
  @Get()
  @ResponseMessage('Pages retrieved successfully')
  @ApiOperation({ summary: 'List published pages (for the storefront footer)' })
  findPublished(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.contentService.findPublished(tenantId);
  }

  @Roles(...ADMIN_ROLES)
  @Get('admin')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Pages retrieved successfully')
  @ApiOperation({ summary: 'Admin: list every page, including unpublished' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.contentService.findAll(tenantId);
  }

  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Page created successfully')
  @ApiOperation({ summary: 'Admin: create a legal/footer page' })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateStaticPageDto,
  ) {
    return this.contentService.create(tenantId, dto);
  }

  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Page updated successfully')
  @ApiOperation({ summary: 'Admin: update a legal/footer page' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaticPageDto,
  ) {
    return this.contentService.update(tenantId, id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete a legal/footer page' })
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.contentService.remove(tenantId, id);
  }

  // Must come last — a dynamic :slug segment would otherwise swallow "admin".
  @Public()
  @Get(':slug')
  @ResponseMessage('Page retrieved successfully')
  @ApiOperation({ summary: 'Get a single published page by slug' })
  findBySlug(
    @CurrentTenant('id') tenantId: string | undefined,
    @Param('slug') slug: string,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.contentService.findPublishedBySlug(tenantId, slug);
  }
}
