import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { QueryKitchenDto } from './dto/query-kitchen.dto';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('kitchen')
@ApiBearerAuth('access-token')
@Controller({ path: 'kitchen', version: '1' })
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
@RequireFeature('kitchen-display')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('meta')
  @RequirePermission('kitchen.view')
  @ResponseMessage('Kitchen settings retrieved successfully')
  @ApiOperation({
    summary:
      'Kitchen: date range, delivery slots, plans and which order types this business has',
  })
  getMeta(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.kitchenService.getMeta({ tenantId, role });
  }

  @Get('orders')
  @RequirePermission('kitchen.view')
  @ResponseMessage('Kitchen orders retrieved successfully')
  @ApiOperation({
    summary:
      "Kitchen: one day's orders and plan deliveries, with stage counts, filters and search",
  })
  getBoard(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('role') role: Role,
    @Query() query: QueryKitchenDto,
  ) {
    return this.kitchenService.getBoard({ tenantId, role }, query);
  }

  @Get('prep-summary')
  @RequirePermission('kitchen.view')
  @ResponseMessage('Prep summary retrieved successfully')
  @ApiOperation({
    summary:
      "Kitchen: one day's dish and add-on totals still to cook, plus special requests",
  })
  getPrepSummary(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('role') role: Role,
    @Query() query: QueryKitchenDto,
  ) {
    return this.kitchenService.getPrepSummary({ tenantId, role }, query);
  }

  @Patch('orders/:id/status')
  @RequirePermission('kitchen.update')
  @ResponseMessage('Order updated')
  @ApiOperation({
    summary: 'Kitchen: Start (PREPARING) or Mark ready (READY) an order',
  })
  move(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('role') role: Role,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKitchenStatusDto,
  ) {
    return this.kitchenService.move({ tenantId, role }, id, dto.status);
  }
}
