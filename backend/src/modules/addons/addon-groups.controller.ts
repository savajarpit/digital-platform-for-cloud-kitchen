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
import { AddonGroupsService } from './addon-groups.service';
import { CreateAddonGroupDto } from './dto/create-addon-group.dto';
import { UpdateAddonGroupDto } from './dto/update-addon-group.dto';
import { CreateAddonItemDto } from './dto/create-addon-item.dto';
import { UpdateAddonItemDto } from './dto/update-addon-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('addons')
@Controller({ path: 'addon-groups', version: '1' })
@Roles(...ADMIN_ROLES)
@RequireFeature('menu-addons')
@RequirePermission('menu.manage')
export class AddonGroupsController {
  constructor(private readonly addonGroupsService: AddonGroupsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Add-on groups retrieved successfully')
  @ApiOperation({
    summary: 'Admin: list every add-on group (with its items) for this tenant',
  })
  findAll(@CurrentTenantId() tenantId: string) {
    return this.addonGroupsService.findAllForTenant(tenantId);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Add-on group created successfully')
  @ApiOperation({
    summary: 'Admin: create a reusable add-on group (e.g. "Roti Extras")',
  })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateAddonGroupDto,
  ) {
    return this.addonGroupsService.createGroup(tenantId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Add-on group updated successfully')
  @ApiOperation({ summary: 'Admin: rename/reconfigure an add-on group' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddonGroupDto,
  ) {
    return this.addonGroupsService.updateGroup(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin: delete an add-on group and its items, detaching it from every meal',
  })
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.addonGroupsService.deleteGroup(tenantId, id);
  }

  @Post('items')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Add-on item created successfully')
  @ApiOperation({
    summary: 'Admin: add an item to a group (e.g. "Extra Roti")',
  })
  createItem(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateAddonItemDto,
  ) {
    return this.addonGroupsService.createItem(tenantId, dto);
  }

  @Patch('items/:id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Add-on item updated successfully')
  @ApiOperation({
    summary:
      'Admin: update an add-on item — price, max quantity, or in-stock status',
  })
  updateItem(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddonItemDto,
  ) {
    return this.addonGroupsService.updateItem(tenantId, id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete an add-on item' })
  async removeItem(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.addonGroupsService.deleteItem(tenantId, id);
  }
}
