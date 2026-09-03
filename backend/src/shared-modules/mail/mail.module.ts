import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';

@Module({
  imports: [NotificationTemplatesModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
