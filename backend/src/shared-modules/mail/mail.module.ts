import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';
import { EmailProviderFactory } from '../../modules/notifications/providers/email/email-provider.factory';

@Module({
  imports: [NotificationTemplatesModule],
  // EmailProviderFactory is stateless (ConfigService only) — provided here
  // too so MailService can send tenant users' emails from the tenant's own
  // SMTP without importing NotificationsModule (which imports MailModule).
  providers: [MailService, EmailProviderFactory],
  exports: [MailService],
})
export class MailModule {}
