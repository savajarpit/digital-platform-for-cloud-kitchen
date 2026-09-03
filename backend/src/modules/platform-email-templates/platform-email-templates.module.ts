import { Module } from '@nestjs/common';
import { PlatformEmailTemplatesController } from './platform-email-templates.controller';
import { NotificationTemplatesModule } from '../../shared-modules/notification-templates/notification-templates.module';
import { MailModule } from '../../shared-modules/mail/mail.module';

@Module({
  imports: [NotificationTemplatesModule, MailModule],
  controllers: [PlatformEmailTemplatesController],
})
export class PlatformEmailTemplatesModule {}
