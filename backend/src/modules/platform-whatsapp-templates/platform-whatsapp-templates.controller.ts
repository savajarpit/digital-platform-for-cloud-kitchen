import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformWhatsAppTemplateService } from '../../shared-modules/notification-templates/platform-whatsapp-template.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdatePlatformWhatsAppTemplateDto } from './dto/update-platform-whatsapp-template.dto';

/** SUPER_ADMIN-only registry of the real Meta/Interakt-approved WhatsApp
 * template per notification key. The message wording itself lives outside
 * this app (Interakt dashboard, Meta-reviewed) — this only records which
 * approved template name to send and how our data maps onto its
 * placeholders, so a tenant with the matching permission can see the exact
 * message that goes out, or pick between variants if more than one is ever
 * registered here. */
@ApiTags('platform-whatsapp-templates')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN)
@Controller({ path: 'platform/whatsapp-templates', version: '1' })
export class PlatformWhatsAppTemplatesController {
  constructor(private readonly service: PlatformWhatsAppTemplateService) {}

  @Get()
  @ResponseMessage('WhatsApp templates retrieved successfully')
  @ApiOperation({ summary: 'Every registered WhatsApp template' })
  listAll() {
    return this.service.listAll();
  }

  @Get(':key')
  @ResponseMessage('WhatsApp template retrieved successfully')
  @ApiOperation({ summary: 'One template by key' })
  getByKey(@Param('key') key: string) {
    return this.service.getByKeyOrThrow(key);
  }

  @Patch(':key')
  @ResponseMessage('WhatsApp template updated successfully')
  @ApiOperation({
    summary: 'Point a notification key at a different approved template name',
  })
  update(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformWhatsAppTemplateDto,
  ) {
    return this.service.update(key, dto);
  }
}
