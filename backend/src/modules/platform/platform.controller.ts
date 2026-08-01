import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { PlatformBillingService } from '../platform-billing/platform-billing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateNotificationSettingsDto } from '../settings/dto/update-notification-settings.dto';
import { UpdatePaymentSettingsDto } from '../settings/dto/update-payment-settings.dto';
import { CreateSubscriptionInviteDto } from '../platform-billing/dto/create-subscription-invite.dto';

@ApiTags('platform')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN)
@Controller({ path: 'platform', version: '1' })
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly platformBillingService: PlatformBillingService,
  ) {}

  @Post('tenants')
  @ResponseMessage('Tenant created successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: provision a new tenant + its OWNER login',
  })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.platformService.createTenant(dto);
  }

  @Get('tenants')
  @ResponseMessage('Tenants retrieved successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: list every tenant' })
  listTenants() {
    return this.platformService.listTenants();
  }

  @Get('tenants/:id')
  @ResponseMessage('Tenant retrieved successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: get full tenant detail' })
  getTenant(@Param('id') id: string) {
    return this.platformService.getTenant(id);
  }

  @Patch('tenants/:id')
  @ResponseMessage('Tenant updated successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: update tenant name/domain/status',
  })
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.platformService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/notifications')
  @ResponseMessage("Tenant's notification settings updated successfully")
  @ApiOperation({
    summary:
      "SUPER_ADMIN-only: set a tenant's WhatsApp/email credentials directly (not delegated to the tenant owner by default)",
  })
  updateTenantNotifications(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.platformService.updateTenantNotifications(id, dto);
  }

  @Patch('tenants/:id/payment')
  @ResponseMessage("Tenant's payment settings updated successfully")
  @ApiOperation({
    summary:
      "SUPER_ADMIN-only: set a tenant's Razorpay credentials directly (not delegated to the tenant owner by default)",
  })
  updateTenantPayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.platformService.updateTenantPayment(id, dto);
  }

  @Post('tenants/:id/subscription')
  @ResponseMessage('Activation invite created')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: create a PlatformSubscription (PENDING_PAYMENT) + emailed activation link',
  })
  createSubscriptionInvite(
    @Param('id') id: string,
    @Body() dto: CreateSubscriptionInviteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.platformBillingService.createInvite(id, dto, userId);
  }

  @Patch('tenants/:id/activate')
  @ResponseMessage('Tenant activated')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: manually activate a tenant, bypassing the invite/payment flow (comped/offline-paid/test)',
  })
  async manualActivate(@Param('id') id: string) {
    await this.platformBillingService.manualActivate(id);
  }

  @Get('tenants/:id/invoices')
  @ResponseMessage('Invoices retrieved successfully')
  @ApiOperation({
    summary:
      "SUPER_ADMIN-only: this tenant's platform-subscription payment history",
  })
  listInvoices(@Param('id') id: string) {
    return this.platformBillingService.listInvoices(id);
  }

  @Post('tenants/:id/subscription/cancel')
  @ResponseMessage('Cancellation scheduled')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: schedule cancellation for the end of the current billing period (not immediate)',
  })
  async scheduleCancellation(@Param('id') id: string) {
    await this.platformBillingService.scheduleCancellation(id);
  }

  @Post('tenants/:id/subscription/resume')
  @ResponseMessage('Subscription resumed')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: undo a scheduled cancellation before it takes effect',
  })
  async resumeSubscription(@Param('id') id: string) {
    await this.platformBillingService.resumeSubscription(id);
  }
}
