import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { FeaturesModule } from '../features/features.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [FeaturesModule, PermissionsModule, SettingsModule],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenRepository],
})
export class KitchenModule {}
