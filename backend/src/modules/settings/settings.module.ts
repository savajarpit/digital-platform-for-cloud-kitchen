import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { OrderAcceptanceService } from './order-acceptance.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository, OrderAcceptanceService],
  exports: [SettingsService, SettingsRepository, OrderAcceptanceService],
})
export class SettingsModule {}
