import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

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
}
