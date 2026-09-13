import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('dine-in')
@Controller({ path: 'waitlist', version: '1' })
@Roles(...ADMIN_ROLES)
@RequireFeature('dine-in')
@RequirePermission('dine-in.order-create')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Waitlist retrieved successfully')
  @ApiOperation({ summary: 'Admin: list guests currently waiting for a table' })
  findActive(
    @CurrentTenantId() tenantId: string,
    @Query('kitchenZoneId') kitchenZoneId?: string,
  ) {
    return this.waitlistService.findActive(tenantId, kitchenZoneId);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Added to waitlist')
  @ApiOperation({
    summary:
      'Admin: add a walk-in party to the waitlist queue — no order, no items',
  })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateWaitlistEntryDto,
  ) {
    return this.waitlistService.create(tenantId, dto);
  }

  @Post(':id/cancel')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Removed from waitlist')
  @ApiOperation({
    summary: 'Admin: remove a waiting party (left without being seated)',
  })
  cancel(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.waitlistService.cancel(tenantId, id);
  }
}
