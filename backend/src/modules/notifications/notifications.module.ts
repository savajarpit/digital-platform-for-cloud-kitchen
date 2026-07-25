import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsService } from './notifications.service';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp-provider.factory';
import { EmailProviderFactory } from './providers/email/email-provider.factory';
import { MailModule } from '../../shared-modules/mail/mail.module';

@Module({
  imports: [HttpModule, MailModule],
  providers: [
    NotificationsService,
    WhatsAppProviderFactory,
    EmailProviderFactory,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
