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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('menu')
@Controller({ path: 'menu/categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ResponseMessage('Categories retrieved successfully')
  @ApiOperation({ summary: 'List active categories for the storefront' })
  findAll(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.categoriesService.findAll(tenantId, true);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @Get('admin')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Categories retrieved successfully')
  @ApiOperation({
    summary: 'List all categories (including inactive) for admin',
  })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.categoriesService.findAll(tenantId, false);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('menu.manage')
  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Category created successfully')
  @ApiOperation({ summary: 'Create a menu category' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('menu.manage')
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Category updated successfully')
  @ApiOperation({ summary: 'Update a menu category' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('menu.manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a menu category' })
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.categoriesService.remove(tenantId, id);
  }
}
