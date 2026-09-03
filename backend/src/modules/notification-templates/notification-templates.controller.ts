import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationTemplatesService } from './notification-templates.service';
import { UpsertTenantEmailTemplateDto } from './dto/upsert-tenant-email-template.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;
const FEATURE_KEY = 'custom-notification-templates';

/** Tenant-facing template customization — gated two ways: the
 * custom-notification-templates Feature (SUPER_ADMIN-only, per tenant) must
 * be on at all, and the caller's role needs the matching Permission
 * (notification-templates.email.edit / .whatsapp.edit — kept separate so
 * one can be granted without the other). */
@ApiTags('notification-templates')
@ApiBearerAuth('access-token')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'notification-templates', version: '1' })
export class NotificationTemplatesController {
  constructor(private readonly service: NotificationTemplatesService) {}

  @Get('email/me')
  @RequireFeature(FEATURE_KEY)
  @ResponseMessage('Notification templates retrieved successfully')
  @ApiOperation({
    summary:
      'Effective (default or overridden) content for the 3 tenant-customizable email keys',
  })
  listEmail(@CurrentTenantId() tenantId: string) {
    return this.service.listEmailTemplates(tenantId);
  }

  @Patch('email/:key')
  @RequireFeature(FEATURE_KEY)
  @RequirePermission('notification-templates.email.edit')
  @ResponseMessage('Email template updated successfully')
  @ApiOperation({ summary: 'Save this tenant’s own wording for one key' })
  upsertEmail(
    @CurrentTenantId() tenantId: string,
    @Param('key') key: string,
    @Body() dto: UpsertTenantEmailTemplateDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.upsertEmailOverride(tenantId, key, dto, userId);
  }

  @Delete('email/:key')
  @RequireFeature(FEATURE_KEY)
  @RequirePermission('notification-templates.email.edit')
  @ResponseMessage('Reverted to the platform default')
  @ApiOperation({ summary: 'Discard this tenant’s override, back to default' })
  async resetEmail(
    @CurrentTenantId() tenantId: string,
    @Param('key') key: string,
  ) {
    await this.service.resetEmailOverride(tenantId, key);
    return { key };
  }

  @Get('whatsapp')
  @RequireFeature(FEATURE_KEY)
  @RequirePermission('notification-templates.whatsapp.edit')
  @ResponseMessage('WhatsApp template preview retrieved successfully')
  @ApiOperation({
    summary:
      'Exactly which approved WhatsApp template will send and how data maps onto it',
  })
  listWhatsApp() {
    return this.service.listWhatsAppPreviews();
  }
}
