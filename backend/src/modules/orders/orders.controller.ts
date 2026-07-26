import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Orders retrieved successfully')
  @ApiOperation({ summary: "List the current user's orders" })
  findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ordersService.findAll(tenantId, userId);
  }

  // Must come before @Get(':id') — otherwise "admin" would be parsed as an order id.
  @Get('admin')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('orders.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Orders retrieved successfully')
  @ApiOperation({ summary: 'Admin: list every order for this tenant (paginated, filterable by status)' })
  findAllForAdmin(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryAdminOrdersDto,
  ) {
    return this.ordersService.findAllForAdmin(tenantId, query);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Order retrieved successfully')
  @ApiOperation({ summary: 'Get a single order' })
  findOne(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(tenantId, userId, id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Order created — proceed to payment')
  @ApiOperation({
    summary: 'Create an order and a matching Razorpay order to pay for it',
  })
  create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, userId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('orders.manage')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Order status updated successfully')
  @ApiOperation({ summary: 'Admin: progress an order through kitchen/delivery statuses' })
  updateStatus(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(tenantId, id, dto);
  }
}
