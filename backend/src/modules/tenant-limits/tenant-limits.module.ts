import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TenantLimitsController } from './tenant-limits.controller';
import { TenantLimitsService } from './tenant-limits.service';
import { TenantLimitsRepository } from './tenant-limits.repository';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule, BullModule.registerQueue({ name: 'mail' })],
  controllers: [TenantLimitsController],
  providers: [TenantLimitsService, TenantLimitsRepository],
  exports: [TenantLimitsService, TenantLimitsRepository],
})
export class TenantLimitsModule {}
