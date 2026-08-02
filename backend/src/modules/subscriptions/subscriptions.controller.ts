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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanDaysDto } from './dto/upsert-plan-days.dto';
import { PublishPlanDto } from './dto/publish-plan.dto';
import { QueryAdminPlansDto } from './dto/query-admin-plans.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { VerifyPlanPaymentDto } from './dto/verify-plan-payment.dto';
import { SkipDayDto } from './dto/skip-day.dto';
import { PauseDto } from './dto/pause.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─── Admin plan authoring ─────────────────────────────────

  @Get('plans/admin')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plans retrieved successfully')
  @ApiOperation({
    summary: 'Admin: list every curated plan for this tenant, paginated',
  })
  findPlansForAdmin(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryAdminPlansDto,
  ) {
    return this.subscriptionsService.findPlansForAdmin(tenantId, query);
  }

  @Public()
  @Get('plans')
  @ResponseMessage('Plans retrieved successfully')
  @ApiOperation({ summary: 'List published curated plans for the storefront' })
  findPublishedPlans(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.subscriptionsService.findPublishedPlans(tenantId);
  }

  @Public()
  @Get('plans/:id')
  @ResponseMessage('Plan retrieved successfully')
  @ApiOperation({
    summary: 'Get a single published curated plan, with its full day/slot tree',
  })
  findPublishedPlan(
    @CurrentTenant('id') tenantId: string | undefined,
    @Param('id') id: string,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.subscriptionsService.findPublishedPlan(tenantId, id);
  }

  @Get('plans/admin/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan retrieved successfully')
  @ApiOperation({
    summary:
      'Admin: get a single plan (any publish state), with its day/slot tree',
  })
  findPlanForAdmin(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.findPlanForAdmin(tenantId, id);
  }

  @Post('plans')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan created successfully')
  @ApiOperation({
    summary: 'Admin: create a curated plan shell (name/price/duration)',
  })
  createPlan(@CurrentTenantId() tenantId: string, @Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(tenantId, dto);
  }

  @Patch('plans/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan updated successfully')
  @ApiOperation({ summary: 'Admin: update plan metadata' })
  updatePlan(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.subscriptionsService.updatePlan(tenantId, id, dto);
  }

  @Put('plans/:id/days')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan days saved successfully')
  @ApiOperation({
    summary: 'Admin: replace the whole day/slot tree for a plan',
  })
  replacePlanDays(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPlanDaysDto,
  ) {
    return this.subscriptionsService.replacePlanDays(tenantId, id, dto);
  }

  @Patch('plans/:id/publish')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan publish state updated')
  @ApiOperation({
    summary: 'Admin: publish/unpublish a plan — can publish with TBD slots',
  })
  publishPlan(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PublishPlanDto,
  ) {
    return this.subscriptionsService.publishPlan(tenantId, id, dto);
  }

  @Delete('plans/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete a plan' })
  async deletePlan(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.subscriptionsService.deletePlan(tenantId, id);
  }

  @Get('admin')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscriptions retrieved successfully')
  @ApiOperation({
    summary: 'Admin: list every customer subscription for this tenant',
  })
  findAllSubscriptionsForAdmin(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryAdminPlansDto,
  ) {
    return this.subscriptionsService.findAllSubscriptionsForAdmin(
      tenantId,
      query,
    );
  }

  // ─── Customer ──────────────────────────────────────────────

  @Post()
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription created — proceed to payment')
  @ApiOperation({
    summary: 'Subscribe to a curated plan and create a matching Razorpay order',
  })
  subscribe(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(tenantId, userId, dto);
  }

  @Post('payments/verify')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Payment verified')
  @ApiOperation({
    summary:
      'Verify a plan-signup Razorpay payment and activate the subscription',
  })
  verifyPayment(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyPlanPaymentDto,
  ) {
    return this.subscriptionsService.verifyPayment(tenantId, userId, dto);
  }

  @Get('mine')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscriptions retrieved successfully')
  @ApiOperation({ summary: "List the current user's subscriptions" })
  findMySubscriptions(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subscriptionsService.findMySubscriptions(tenantId, userId);
  }

  @Get('mine/:id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription retrieved successfully')
  @ApiOperation({
    summary: 'Get a single subscription, incl. an upcoming-days preview',
  })
  findMySubscription(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.findMySubscription(tenantId, userId, id);
  }

  @Post('mine/:id/skip')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Day skipped')
  @ApiOperation({
    summary:
      "Skip a single day — banked forward onto the subscription's cycle end",
  })
  skipDay(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SkipDayDto,
  ) {
    return this.subscriptionsService.skipDay(tenantId, userId, id, dto);
  }

  @Post('mine/:id/pause')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription paused for the selected range')
  @ApiOperation({
    summary:
      'Pause delivery for a date range — banked forward the same as a skip',
  })
  pause(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: PauseDto,
  ) {
    return this.subscriptionsService.pause(tenantId, userId, id, dto);
  }

  @Post('mine/:id/cancel')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription cancelled')
  @ApiOperation({ summary: 'Cancel a subscription' })
  cancel(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.cancel(tenantId, userId, id);
  }
}
