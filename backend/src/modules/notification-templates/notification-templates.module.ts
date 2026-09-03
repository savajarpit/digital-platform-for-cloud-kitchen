import { Module } from '@nestjs/common';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationTemplatesModule as SharedNotificationTemplatesModule } from '../../shared-modules/notification-templates/notification-templates.module';

@Module({
  imports: [SharedNotificationTemplatesModule],
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
