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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { OrderAcceptanceService } from './order-acceptance.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { PublicConfigResponseDto } from './dto/public-config-response.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { UpdateHomePageContentDto } from './dto/update-home-page-content.dto';
import { UpdateOrderAcceptanceDto } from './dto/update-order-acceptance.dto';
import { UpdateInstantDeliverySettingsDto } from './dto/update-instant-delivery-settings.dto';
import { UpdateDeliveryZonesDto } from './dto/update-delivery-zones.dto';
import { CreateServiceablePincodeDto } from './dto/create-serviceable-pincode.dto';
import { UpdateServiceablePincodeDto } from './dto/update-serviceable-pincode.dto';
import { CreateKitchenZoneDto } from './dto/create-kitchen-zone.dto';
import { UpdateKitchenZoneDto } from './dto/update-kitchen-zone.dto';
import { CreateDeliverySlotDto } from './dto/create-delivery-slot.dto';
import { UpdateDeliverySlotDto } from './dto/update-delivery-slot.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import {
  redactNotificationSettings,
  redactPaymentSettings,
} from '../../common/utils/settings-redaction.util';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('settings')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly orderAcceptanceService: OrderAcceptanceService,
  ) {}

  @Public()
  @Get('public-config')
  @ResponseMessage('Public config retrieved successfully')
  @ApiOperation({ summary: 'Get the storefront branding/theme/locale config' })
  @ApiResponse({ status: 200, type: PublicConfigResponseDto })
  getPublicConfig(@CurrentTenant('id') tenantId: string | undefined) {
    return this.settingsService.getPublicConfig(tenantId);
  }

  @Public()
  @Get('order-window/status')
  @ResponseMessage('Order window status retrieved successfully')
  @ApiOperation({
    summary: 'Check whether the storefront is currently accepting orders',
  })
  getOrderWindowStatus(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.orderAcceptanceService.getStatus(tenantId);
  }

  @Public()
  @Get('delivery-slots')
  @ResponseMessage('Delivery slots retrieved successfully')
  @ApiOperation({ summary: 'List the active delivery slots for checkout' })
  getDeliverySlots(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.settingsService.getDeliverySlots(tenantId);
  }

  @Public()
  @Get('pickup')
  @ResponseMessage('Pickup availability retrieved successfully')
  @ApiOperation({
    summary:
      "Whether pickup is offered right now, and the tenant's pickup-eligible kitchen zones",
  })
  getPickupInfo(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.settingsService.getPickupInfo(tenantId);
  }

  @Public()
  @Get('instant-delivery/status')
  @ResponseMessage('Instant delivery status retrieved successfully')
  @ApiOperation({
    summary:
      'Whether instant delivery is currently offered (enabled + kitchen open) + its ETA window',
  })
  getInstantDeliveryStatus(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.orderAcceptanceService.getInstantDeliveryStatus(tenantId);
  }

  // ── Business profile / branding ──────────────────────────

  @Get('business-profile')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Business profile retrieved successfully')
  @ApiOperation({ summary: 'Admin: get the full business profile' })
  getBusinessProfile(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getBusinessProfile(tenantId);
  }

  @Patch('business-profile')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Business profile updated successfully')
  @ApiOperation({ summary: 'Admin: update branding/contact/theme' })
  updateBusinessProfile(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.settingsService.updateBusinessProfile(tenantId, dto);
  }

  // ── Home page content (hero / CTA / reviews-section copy) ───

  @Get('home-page-content')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home page content retrieved successfully')
  @ApiOperation({ summary: 'Admin: get hero/CTA/reviews-section copy' })
  getHomePageContent(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getHomePageContent(tenantId);
  }

  @Patch('home-page-content')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.branding.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Home page content updated successfully')
  @ApiOperation({ summary: 'Admin: update hero/CTA/reviews-section copy' })
  updateHomePageContent(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateHomePageContentDto,
  ) {
    return this.settingsService.updateHomePageContent(tenantId, dto);
  }

  // ── Order acceptance ──────────────────────────────────────

  @Get('order-acceptance')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Order acceptance settings retrieved successfully')
  @ApiOperation({ summary: 'Admin: get operating hours / cutoff / closures' })
  getOrderAcceptance(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getOrderAcceptanceSettings(tenantId);
  }

  @Patch('order-acceptance')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.order-hours.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Order acceptance settings updated successfully')
  @ApiOperation({
    summary: 'Admin: update operating hours / cutoff / closures',
  })
  async updateOrderAcceptance(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateOrderAcceptanceDto,
  ) {
    const result = await this.settingsService.updateOrderAcceptance(
      tenantId,
      dto,
    );
    await this.orderAcceptanceService.invalidateCache(tenantId);
    return result;
  }

  // ── Instant delivery ───────────────────────────────────────

  @Get('instant-delivery')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Instant delivery settings retrieved successfully')
  @ApiOperation({
    summary: 'Admin: get the instant-delivery toggle + ETA window',
  })
  getInstantDeliverySettings(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getInstantDeliverySettings(tenantId);
  }

  @Patch('instant-delivery')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.order-hours.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Instant delivery settings updated successfully')
  @ApiOperation({
    summary: 'Admin: update the instant-delivery toggle + ETA window',
  })
  updateInstantDeliverySettings(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateInstantDeliverySettingsDto,
  ) {
    return this.settingsService.updateInstantDeliverySettings(tenantId, dto);
  }

  // ── Delivery zones (kitchen geo, fees, advance window, slots, pincodes) ─

  @Patch('delivery-zones')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Delivery zone settings updated successfully')
  @ApiOperation({
    summary: 'Admin: update the max-advance-order-days delivery window',
  })
  updateDeliveryZones(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateDeliveryZonesDto,
  ) {
    return this.settingsService.updateDeliveryZones(tenantId, dto);
  }

  @Get('serviceable-pincodes')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Serviceable pincodes retrieved successfully')
  @ApiOperation({ summary: 'Admin: list serviceable pincodes' })
  getServiceablePincodes(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getServiceablePincodes(tenantId);
  }

  @Post('serviceable-pincodes')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Serviceable pincode created successfully')
  @ApiOperation({ summary: 'Admin: add a serviceable pincode' })
  createServiceablePincode(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateServiceablePincodeDto,
  ) {
    return this.settingsService.createServiceablePincode(tenantId, dto);
  }

  @Patch('serviceable-pincodes/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Serviceable pincode updated successfully')
  @ApiOperation({ summary: 'Admin: update a serviceable pincode' })
  updateServiceablePincode(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceablePincodeDto,
  ) {
    return this.settingsService.updateServiceablePincode(tenantId, id, dto);
  }

  @Delete('serviceable-pincodes/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: remove a serviceable pincode' })
  async deleteServiceablePincode(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.settingsService.deleteServiceablePincode(tenantId, id);
  }

  @Get('kitchen-zones')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Kitchen zones retrieved successfully')
  @ApiOperation({ summary: 'Admin: list kitchen/outlet zones' })
  getKitchenZones(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getKitchenZones(tenantId);
  }

  @Post('kitchen-zones')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Kitchen zone created successfully')
  @ApiOperation({ summary: 'Admin: add a kitchen/outlet zone' })
  createKitchenZone(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateKitchenZoneDto,
  ) {
    return this.settingsService.createKitchenZone(tenantId, dto);
  }

  @Patch('kitchen-zones/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Kitchen zone updated successfully')
  @ApiOperation({ summary: 'Admin: update a kitchen/outlet zone' })
  updateKitchenZone(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenZoneDto,
  ) {
    return this.settingsService.updateKitchenZone(tenantId, id, dto);
  }

  @Delete('kitchen-zones/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: remove a kitchen/outlet zone' })
  async deleteKitchenZone(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.settingsService.deleteKitchenZone(tenantId, id);
  }

  @Get('delivery-slots/admin')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Delivery slots retrieved successfully')
  @ApiOperation({
    summary: 'Admin: list every delivery slot, including inactive',
  })
  getAllDeliverySlots(@CurrentTenantId() tenantId: string) {
    return this.settingsService.getAllDeliverySlots(tenantId);
  }

  @Post('delivery-slots')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Delivery slot created successfully')
  @ApiOperation({ summary: 'Admin: add a delivery slot' })
  createDeliverySlot(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateDeliverySlotDto,
  ) {
    return this.settingsService.createDeliverySlot(tenantId, dto);
  }

  @Patch('delivery-slots/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Delivery slot updated successfully')
  @ApiOperation({ summary: 'Admin: update a delivery slot' })
  updateDeliverySlot(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeliverySlotDto,
  ) {
    return this.settingsService.updateDeliverySlot(tenantId, id, dto);
  }

  @Delete('delivery-slots/:id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.delivery-zones.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: remove a delivery slot' })
  async deleteDeliverySlot(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.settingsService.deleteDeliverySlot(tenantId, id);
  }

  // ── Notifications ──────────────────────────────────────────

  @Get('notifications')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Notification settings retrieved successfully')
  @ApiOperation({
    summary: 'Admin: get notification config (secrets redacted)',
  })
  async getNotificationSettings(@CurrentTenantId() tenantId: string) {
    const settings =
      await this.settingsService.getNotificationSettings(tenantId);
    return settings ? redactNotificationSettings(settings) : null;
  }

  @Patch('notifications')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.notifications.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Notification settings updated successfully')
  @ApiOperation({ summary: 'Admin: update WhatsApp/email notification config' })
  async updateNotificationSettings(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.settingsService.updateNotificationSettings(
      tenantId,
      dto,
    );
    return redactNotificationSettings(settings);
  }

  // ── Payments ───────────────────────────────────────────────

  @Get('payment')
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Payment settings retrieved successfully')
  @ApiOperation({ summary: 'Admin: get Razorpay config (secrets redacted)' })
  async getPaymentSettings(@CurrentTenantId() tenantId: string) {
    const settings = await this.settingsService.getPaymentSettings(tenantId);
    return settings ? redactPaymentSettings(settings) : null;
  }

  @Patch('payment')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.payment.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Payment settings updated successfully')
  @ApiOperation({ summary: 'Admin: update Razorpay config' })
  async updatePaymentSettings(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    const settings = await this.settingsService.updatePaymentSettings(
      tenantId,
      dto,
    );
    return redactPaymentSettings(settings);
  }
}
