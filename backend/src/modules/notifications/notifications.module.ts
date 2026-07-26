import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationLogsRepository } from './notification-logs.repository';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp-provider.factory';
import { EmailProviderFactory } from './providers/email/email-provider.factory';
import { MailModule } from '../../shared-modules/mail/mail.module';
import { OrdersModule } from '../orders/orders.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    HttpModule,
    MailModule,
    BullModule.registerQueue({ name: 'notifications' }),
    OrdersModule,
    SettingsModule,
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationLogsRepository,
    WhatsAppProviderFactory,
    EmailProviderFactory,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
