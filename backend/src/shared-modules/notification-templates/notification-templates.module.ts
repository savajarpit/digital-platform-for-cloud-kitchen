import { Module } from '@nestjs/common';
import { FeaturesModule } from '../../modules/features/features.module';
import { PlatformEmailTemplateRepository } from './platform-email-template.repository';
import { PlatformEmailTemplateService } from './platform-email-template.service';
import { TenantNotificationTemplateRepository } from './tenant-notification-template.repository';
import { TenantNotificationTemplateService } from './tenant-notification-template.service';
import { PlatformWhatsAppTemplateRepository } from './platform-whatsapp-template.repository';
import { PlatformWhatsAppTemplateService } from './platform-whatsapp-template.service';

/**
 * Infrastructure-style module (lives under shared-modules/ despite having
 * no controllers of its own, same shape as MailModule) — the single owner
 * of every email/WhatsApp template's storage and rendering logic. Consumed
 * by MailModule + NotificationsModule (to actually render/send) and by the
 * platform-email-templates / platform-whatsapp-templates /
 * notification-templates controller modules (to manage them).
 */
@Module({
  imports: [FeaturesModule],
  providers: [
    PlatformEmailTemplateRepository,
    PlatformEmailTemplateService,
    TenantNotificationTemplateRepository,
    TenantNotificationTemplateService,
    PlatformWhatsAppTemplateRepository,
    PlatformWhatsAppTemplateService,
  ],
  exports: [
    PlatformEmailTemplateService,
    TenantNotificationTemplateService,
    PlatformWhatsAppTemplateService,
  ],
})
export class NotificationTemplatesModule {}
