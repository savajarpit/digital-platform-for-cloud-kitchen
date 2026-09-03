import { Module } from '@nestjs/common';
import { PlatformWhatsAppTemplatesController } from './platform-whatsapp-templates.controller';
import { NotificationTemplatesModule } from '../../shared-modules/notification-templates/notification-templates.module';

@Module({
  imports: [NotificationTemplatesModule],
  controllers: [PlatformWhatsAppTemplatesController],
})
export class PlatformWhatsAppTemplatesModule {}
