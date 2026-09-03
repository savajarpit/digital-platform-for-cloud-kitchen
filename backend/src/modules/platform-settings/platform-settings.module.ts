import { Module } from '@nestjs/common';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsModule as SharedPlatformSettingsModule } from '../../shared-modules/platform-settings/platform-settings.module';

@Module({
  imports: [SharedPlatformSettingsModule],
  controllers: [PlatformSettingsController],
})
export class PlatformSettingsModule {}
