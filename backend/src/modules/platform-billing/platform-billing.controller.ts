import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Get,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PlatformBillingService } from './platform-billing.service';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { SwitchPlanVerifyDto } from './dto/switch-plan-verify.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('platform-billing')
@Controller({ path: 'platform', version: '1' })
export class PlatformBillingController {
  constructor(
    private readonly platformBillingService: PlatformBillingService,
  ) {}

  @Public()
  @Get('activate/:token')
  @ResponseMessage('Activation details retrieved')
  @ApiOperation({
    summary:
      "Public: get a tenant activation invite's details (no login required)",
  })
  getInvite(@Param('token') token: string) {
    return this.platformBillingService.getInviteDetails(token);
  }

  @Public()
  @Post('activate/:token/verify')
  @ResponseMessage('Tenant activated')
  @ApiOperation({
    summary:
      'Public: verify the activation payment and flip the tenant to ACTIVE',
  })
  verify(@Param('token') token: string, @Body() dto: VerifyActivationDto) {
    return this.platformBillingService.verifyAndActivate(token, dto);
  }

  @Post('plans/:id/switch')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Switch checkout ready')
  @ApiOperation({
    summary:
      'Self-serve, step 1 of 2: create a replacement Razorpay subscription for the target plan and return Checkout details — Razorpay does not support an in-place plan change for any real payment method',
  })
  switchPlan(
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.platformBillingService.switchPlan(tenantId, id);
  }

  @Post('plans/switch/verify')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Plan switch processed')
  @ApiOperation({
    summary:
      'Self-serve, step 2 of 2: verify the Checkout payment from switchPlan and take over (upgrade, now) or schedule the handoff (downgrade, at cycle end). Final once verified — Razorpay has no API to undo a scheduled cancellation, so a downgrade switch cannot be cancelled afterward.',
  })
  switchPlanVerify(
    @CurrentTenantId() tenantId: string,
    @Body() dto: SwitchPlanVerifyDto,
  ) {
    return this.platformBillingService.switchPlanVerify(tenantId, dto);
  }

  @Public()
  @SkipThrottle()
  @Post('billing/webhook')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Webhook received')
  @ApiExcludeEndpoint()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    await this.platformBillingService.handleWebhook(
      req.rawBody,
      signature,
      eventId,
    );
    return { received: true };
  }
}
