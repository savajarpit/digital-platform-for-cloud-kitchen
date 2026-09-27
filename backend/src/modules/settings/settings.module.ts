import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { OrderAcceptanceService } from './order-acceptance.service';
import { PlatformSettingsModule } from '../../shared-modules/platform-settings/platform-settings.module';
import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [PlatformSettingsModule, FeaturesModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository, OrderAcceptanceService],
  exports: [SettingsService, SettingsRepository, OrderAcceptanceService],
})
export class SettingsModule {}
