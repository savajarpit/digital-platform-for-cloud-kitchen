import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformRepository } from './platform.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { SettingsModule } from '../settings/settings.module';
import { PlatformBillingModule } from '../platform-billing/platform-billing.module';

@Module({
  imports: [PermissionsModule, SettingsModule, PlatformBillingModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformRepository],
})
export class PlatformModule {}
