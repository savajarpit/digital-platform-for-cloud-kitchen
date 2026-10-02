import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CancellationRequestsService } from './cancellation-requests.service';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { RejectCancellationRequestDto } from './dto/reject-cancellation-request.dto';
import { QueryCancellationRequestsDto } from './dto/query-cancellation-requests.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const STAFF_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

/**
 * Customer routes ask/withdraw; admin routes are split by kind so each is
 * guarded by its own existing permission — viewing needs *.manage,
 * rejecting needs *.cancel-refund (the same people who can approve).
 */
@ApiTags('cancellation-requests')
@ApiBearerAuth('access-token')
@Controller({ path: 'cancellation-requests', version: '1' })
export class CancellationRequestsController {
  constructor(private readonly service: CancellationRequestsService) {}

  // ── Customer ─────────────────────────────────────────────

  @Roles(Role.CUSTOMER)
  @Post('subscriptions/:subscriptionId')
  @ResponseMessage('Cancellation request sent')
  @ApiOperation({ summary: 'Customer: ask to cancel a subscription' })
  requestSubscription(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() dto: CreateCancellationRequestDto,
  ) {
    return this.service.requestForSubscription(
      tenantId,
      userId,
      subscriptionId,
      dto,
    );
  }

  @Roles(Role.CUSTOMER)
  @Post('orders/:orderId')
  @ResponseMessage('Cancellation request sent')
  @ApiOperation({ summary: 'Customer: ask to cancel a one-time order' })
  requestOrder(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateCancellationRequestDto,
  ) {
    return this.service.requestForOrder(tenantId, userId, orderId, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('orders/:orderId/status')
  @ResponseMessage('Cancellation status retrieved')
  @ApiOperation({
    summary:
      'Customer: latest request for an order and whether one can be raised',
  })
  orderStatus(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.getOrderStatus(tenantId, userId, orderId);
  }

  @Roles(Role.CUSTOMER)
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cancellation request withdrawn')
  @ApiOperation({ summary: 'Customer: take back a pending request' })
  withdraw(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.withdraw(tenantId, userId, id);
  }

  // ── Admin ────────────────────────────────────────────────

  @Roles(...STAFF_ROLES)
  @Get('admin/pending-count')
  @ResponseMessage('Pending cancellation requests counted')
  @ApiOperation({ summary: 'Admin: pending requests per kind (badges)' })
  pendingCount(@CurrentTenantId() tenantId: string) {
    return this.service.countPending(tenantId);
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('subscriptions.manage')
  @Get('admin/subscriptions')
  @ResponseMessage('Cancellation requests retrieved')
  @ApiOperation({ summary: 'Admin: subscription cancellation requests' })
  listSubscriptionRequests(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryCancellationRequestsDto,
  ) {
    return this.service.findAllForAdmin(tenantId, {
      ...query,
      type: 'SUBSCRIPTION',
    });
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('orders.manage')
  @Get('admin/orders')
  @ResponseMessage('Cancellation requests retrieved')
  @ApiOperation({ summary: 'Admin: order cancellation requests' })
  listOrderRequests(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryCancellationRequestsDto,
  ) {
    return this.service.findAllForAdmin(tenantId, { ...query, type: 'ORDER' });
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('subscriptions.manage')
  @Get('admin/subscriptions/:subscriptionId/pending')
  @ResponseMessage('Pending request retrieved')
  @ApiOperation({ summary: 'Admin: the pending request for a subscription' })
  pendingForSubscription(
    @CurrentTenantId() tenantId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    return this.service.findPendingForTarget(tenantId, { subscriptionId });
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('orders.manage')
  @Get('admin/orders/:orderId/pending')
  @ResponseMessage('Pending request retrieved')
  @ApiOperation({ summary: 'Admin: the pending request for an order' })
  pendingForOrder(
    @CurrentTenantId() tenantId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.findPendingForTarget(tenantId, { orderId });
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('subscriptions.cancel-refund')
  @Post('admin/subscriptions/requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cancellation request rejected')
  @ApiOperation({ summary: 'Admin: reject a subscription request' })
  rejectSubscriptionRequest(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') staffUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCancellationRequestDto,
  ) {
    return this.service.reject(tenantId, staffUserId, id, dto, 'SUBSCRIPTION');
  }

  @Roles(...STAFF_ROLES)
  @RequirePermission('orders.cancel-refund')
  @Post('admin/orders/requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cancellation request rejected')
  @ApiOperation({ summary: 'Admin: reject an order request' })
  rejectOrderRequest(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') staffUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCancellationRequestDto,
  ) {
    return this.service.reject(tenantId, staffUserId, id, dto, 'ORDER');
  }
}
