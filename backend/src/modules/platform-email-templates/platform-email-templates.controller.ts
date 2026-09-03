import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformEmailTemplateService } from '../../shared-modules/notification-templates/platform-email-template.service';
import { MailService } from '../../shared-modules/mail/mail.service';
import { renderEmailShell } from '../../shared-modules/email-layout/email-layout.util';
import { SAMPLE_TEMPLATE_DATA } from '../../common/constants/notification-template-defaults';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdatePlatformEmailTemplateDto } from './dto/update-platform-email-template.dto';

/** SUPER_ADMIN-only editor for every email in the system — the 7
 * platform-ops templates (always OkaySync-branded) and the default wording
 * for the 6 customer-facing keys tenants inherit unless they've been
 * granted the custom-notification-templates feature + permission. */
@ApiTags('platform-email-templates')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN)
@Controller({ path: 'platform/email-templates', version: '1' })
export class PlatformEmailTemplatesController {
  constructor(
    private readonly service: PlatformEmailTemplateService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  @ResponseMessage('Email templates retrieved successfully')
  @ApiOperation({ summary: 'Every platform + customer-default email template' })
  listAll() {
    return this.service.listAll();
  }

  @Get(':key')
  @ResponseMessage('Email template retrieved successfully')
  @ApiOperation({ summary: 'One template by key' })
  getByKey(@Param('key') key: string) {
    return this.service.getByKeyOrThrow(key);
  }

  @Patch(':key')
  @ResponseMessage('Email template updated successfully')
  @ApiOperation({ summary: 'Edit a template’s subject/body' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformEmailTemplateDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.update(key, dto, userId);
  }

  @Post(':key/send-test')
  @ResponseMessage('Test email sent to your inbox')
  @ApiOperation({
    summary: 'Render with sample data and send to the caller’s own email',
  })
  async sendTest(
    @Param('key') key: string,
    @CurrentUser('email') email: string,
  ) {
    const { subject, html: innerHtml } = await this.service.render(
      key,
      SAMPLE_TEMPLATE_DATA,
    );
    const row = await this.service.getByKeyOrThrow(key);
    const html = renderEmailShell({
      brandName:
        row.scope === 'PLATFORM_OPS'
          ? 'OkaySync'
          : SAMPLE_TEMPLATE_DATA.businessName,
      bodyHtml: innerHtml,
      ownerLine:
        row.scope === 'PLATFORM_OPS' ? null : SAMPLE_TEMPLATE_DATA.businessName,
      showPoweredBy: true,
    });
    await this.mailService.send(email, `[Test] ${subject}`, html);
    return { sentTo: email };
  }
}
