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
import { SubscriptionDisruptionService } from './subscription-disruption.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanDaysDto } from './dto/upsert-plan-days.dto';
import { PublishPlanDto } from './dto/publish-plan.dto';
import { QueryAdminPlansDto } from './dto/query-admin-plans.dto';
import { QueryAdminSubscriptionsDto } from './dto/query-admin-subscriptions.dto';
import { QuerySubscriptionAnalyticsDto } from './dto/query-subscription-analytics.dto';
import { QueryExpiringSoonDto } from './dto/query-expiring-soon.dto';
import { QueryPrepPlanDto } from './dto/query-prep-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { CreateManualSubscriptionDto } from './dto/create-manual-subscription.dto';
import { VerifyPlanPaymentDto } from './dto/verify-plan-payment.dto';
import { SkipDayDto } from './dto/skip-day.dto';
import { PauseDto } from './dto/pause.dto';
import { SetDayOverrideDto } from './dto/set-day-override.dto';
import { UpdateSubscriptionSettingsDto } from './dto/update-subscription-settings.dto';
import { DeclareDisruptionDto } from './dto/declare-disruption.dto';
import { CancelRefundDto } from '../../shared-modules/refunds/dto/cancel-refund.dto';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';
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
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly disruptionService: SubscriptionDisruptionService,
  ) {}

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
  findPublishedPlans(
    @CurrentTenant('id') tenantId: string | undefined,
    @Query('search') search?: string,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.subscriptionsService.findPublishedPlans(tenantId, search);
  }

  @Public()
  @Get('settings/public')
  @ResponseMessage('Subscription homepage settings retrieved successfully')
  @ApiOperation({
    summary: 'Public: whether the home page should show the plans block',
  })
  getPublicSettings(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.subscriptionsService.getPublicSettings(tenantId);
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

  @Get('plans/admin/:id/cycle-preview')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Cycle preview computed')
  @ApiOperation({
    summary:
      "Admin: project a brand-new subscriber's start/end dates for this plan right now, given its current off-day configuration — the only way to see EXTEND_TO_COMPENSATE's effect without a real test signup",
  })
  previewPlanCycle(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.previewPlanCycle(tenantId, id);
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
    @Query() query: QueryAdminSubscriptionsDto,
  ) {
    return this.subscriptionsService.findAllSubscriptionsForAdmin(
      tenantId,
      query,
    );
  }

  @Get('settings')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription settings retrieved successfully')
  @ApiOperation({
    summary: 'Admin: accept-new-subscriptions toggle + notice-hours window',
  })
  getSettings(@CurrentTenantId() tenantId: string) {
    return this.subscriptionsService.getSettings(tenantId);
  }

  @Patch('settings')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription settings updated successfully')
  @ApiOperation({
    summary: 'Admin: update the accept-toggle / notice-hours window',
  })
  updateSettings(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateSubscriptionSettingsDto,
  ) {
    return this.subscriptionsService.updateSettings(tenantId, dto);
  }

  @Get('admin/today')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage("Today's deliveries retrieved successfully")
  @ApiOperation({
    summary: "Admin: today's kitchen prep sheet + per-subscriber dispatch list",
  })
  getTodaysDeliveries(@CurrentTenantId() tenantId: string) {
    return this.subscriptionsService.getTodaysDeliveries(tenantId);
  }

  @Get('admin/prep-plan')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Prep plan retrieved successfully')
  @ApiOperation({
    summary:
      "Admin: projected meal quantities for a plan's template day — active subscriber count x that day's meals",
  })
  getPrepPlan(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryPrepPlanDto,
  ) {
    return this.subscriptionsService.getPrepPlan(
      tenantId,
      query.planId,
      query.dayNumber,
    );
  }

  @Post('admin/disruptions')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Disruption declared')
  @ApiOperation({
    summary:
      'Admin: declare a real-world disruption (rain, an emergency) for a date — credits affected subscribers extra days and prevents that date from materializing, without touching any already-existing Order',
  })
  declareDisruption(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: DeclareDisruptionDto,
  ) {
    return this.disruptionService.declareDisruption(tenantId, userId, dto);
  }

  @Get('admin/disruptions')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Disruptions retrieved successfully')
  @ApiOperation({ summary: 'Admin: audit list of declared disruptions' })
  listDisruptions(
    @CurrentTenantId() tenantId: string,
    @Query() query: OffsetPaginationDto,
  ) {
    return this.disruptionService.listDisruptions(
      tenantId,
      query.page,
      query.limit,
    );
  }

  @Get('admin/analytics')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscriptions')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription analytics retrieved successfully')
  @ApiOperation({
    summary:
      'Admin: subscriber/revenue analytics dashboard — new subscribers, active count, gross/refunded/net revenue, a trend chart, and a per-plan breakdown',
  })
  getAnalytics(
    @CurrentTenantId() tenantId: string,
    @Query() query: QuerySubscriptionAnalyticsDto,
  ) {
    return this.subscriptionsService.getAnalytics(tenantId, query);
  }

  @Get('admin/analytics/expiring')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscriptions')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Expiring subscriptions retrieved successfully')
  @ApiOperation({
    summary:
      'Admin: ACTIVE subscriptions expiring within a custom number of days — the drill-down behind the analytics tile',
  })
  getExpiringSoon(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryExpiringSoonDto,
  ) {
    return this.subscriptionsService.getExpiringSoon(
      tenantId,
      query.withinDays ?? 7,
    );
  }

  @Post('admin')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manual-create')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription created')
  @ApiOperation({
    summary:
      'Admin: sign a customer up for a subscription plan on their behalf (e.g. a phone signup), settled by cash/UPI — no Razorpay involved',
  })
  createManual(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') staffUserId: string,
    @Body() dto: CreateManualSubscriptionDto,
  ) {
    return this.subscriptionsService.createManual(tenantId, staffUserId, dto);
  }

  @Post('admin/:id/mark-paid')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('payments.manual-record')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription marked as paid')
  @ApiOperation({
    summary:
      'Admin: confirm cash/UPI payment was actually received for a manually-signed-up subscription',
  })
  markPaidManually(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.markPaidManually(tenantId, id);
  }

  // Must come after every other literal `admin/...` route above — otherwise
  // this `:id` wildcard would shadow them (e.g. "today" parsed as an id).
  @Get('admin/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription retrieved successfully')
  @ApiOperation({
    summary:
      "Admin: a single subscriber's full detail — plan/days, address, skips/overrides, latest invoice",
  })
  findSubscriptionForAdmin(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.findSubscriptionForAdmin(tenantId, id);
  }

  @Get('admin/:id/refund-preview')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.manage')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Refund preview computed')
  @ApiOperation({
    summary:
      'Admin: suggested refund amount for this subscription, prorated on undelivered days — a starting point for the cancel-refund form, not the final amount',
  })
  getRefundPreview(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.getRefundPreview(tenantId, id);
  }

  @Post('admin/:id/cancel-refund')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.cancel-refund')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription cancelled')
  @ApiOperation({
    summary:
      'Admin: cancel a subscription and record/issue a refund (manual, or Razorpay if enabled for this tenant)',
  })
  cancelWithRefund(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') staffUserId: string,
    @Param('id') id: string,
    @Body() dto: CancelRefundDto,
  ) {
    return this.subscriptionsService.cancelWithRefund(
      tenantId,
      staffUserId,
      id,
      dto,
    );
  }

  @Post('admin/:id/skip')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.act-on-behalf')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Day skipped')
  @ApiOperation({
    summary:
      "Admin: skip a single day on a customer's behalf — e.g. they called in — banked forward onto the cycle end",
  })
  skipDayAdmin(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SkipDayDto,
  ) {
    return this.subscriptionsService.skipDayAdmin(tenantId, id, dto);
  }

  @Post('admin/:id/pause')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.act-on-behalf')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Subscription paused for the selected range')
  @ApiOperation({
    summary:
      "Admin: pause a date range on a customer's behalf — banked forward the same as a skip",
  })
  pauseAdmin(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PauseDto,
  ) {
    return this.subscriptionsService.pauseAdmin(tenantId, id, dto);
  }

  @Post('admin/:id/day-override')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('subscriptions.act-on-behalf')
  @RequireFeature('subscription-curated-plans')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Day updated')
  @ApiOperation({
    summary:
      "Admin: change the address and/or delivery slot for one specific day, on a customer's behalf",
  })
  setDayOverrideAdmin(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetDayOverrideDto,
  ) {
    return this.subscriptionsService.setDayOverrideAdmin(tenantId, id, dto);
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

  @Get('mine/:id/invoice')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Invoice retrieved successfully')
  @ApiOperation({ summary: 'Get the payment invoice for a subscription' })
  getInvoice(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.getInvoice(tenantId, userId, id);
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

  @Post('mine/:id/day-override')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Delivery updated for that day')
  @ApiOperation({
    summary: 'Change the address and/or delivery slot for one specific day',
  })
  setDayOverride(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SetDayOverrideDto,
  ) {
    return this.subscriptionsService.setDayOverride(tenantId, userId, id, dto);
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
