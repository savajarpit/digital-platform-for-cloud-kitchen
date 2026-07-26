import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { OrderAcceptanceService } from './order-acceptance.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PublicConfigResponseDto } from './dto/public-config-response.dto';

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
}
