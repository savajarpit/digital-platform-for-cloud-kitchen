import { Module } from '@nestjs/common';
import { PlatformPlansController } from './platform-plans.controller';
import { PlatformPlansService } from './platform-plans.service';
import { PlatformPlansRepository } from './platform-plans.repository';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TenantLimitsModule, SettingsModule],
  controllers: [PlatformPlansController],
  providers: [PlatformPlansService, PlatformPlansRepository],
  exports: [PlatformPlansRepository],
})
export class PlatformPlansModule {}
