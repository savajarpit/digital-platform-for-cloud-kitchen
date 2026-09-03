import { Module } from '@nestjs/common';
import { PlatformSettingsRepository } from './platform-settings.repository';
import { PlatformSettingsService } from './platform-settings.service';

/** Infrastructure-style module (no controller of its own), same shape as
 * NotificationTemplatesModule — a pure leaf module (only depends on the
 * global PrismaService) so any feature module can import it without
 * circular-dependency risk. The SUPER_ADMIN-facing GET/PATCH lives in
 * modules/platform-settings/. */
@Module({
  providers: [PlatformSettingsRepository, PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
