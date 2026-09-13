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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiningTablesService } from './dining-tables.service';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('dine-in')
@Controller({ path: 'dining-tables', version: '1' })
@Roles(...ADMIN_ROLES)
@RequireFeature('dine-in')
export class DiningTablesController {
  constructor(private readonly tablesService: DiningTablesService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Tables retrieved successfully')
  @ApiOperation({
    summary:
      'Admin: list dining tables (optionally filtered by outlet), with derived free/occupied status',
  })
  findAll(
    @CurrentTenantId() tenantId: string,
    @Query('kitchenZoneId') kitchenZoneId?: string,
  ) {
    return this.tablesService.findAllForTenant(tenantId, kitchenZoneId);
  }

  @Post()
  @RequirePermission('dine-in.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Table created successfully')
  @ApiOperation({ summary: 'Admin: add a dining table to an outlet' })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateDiningTableDto,
  ) {
    return this.tablesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('dine-in.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Table updated successfully')
  @ApiOperation({
    summary: 'Admin: rename, resize, or deactivate a dining table',
  })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiningTableDto,
  ) {
    return this.tablesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('dine-in.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: remove a dining table' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.tablesService.delete(tenantId, id);
  }
}
