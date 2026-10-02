import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionsRepository } from './promotions.repository';
import { SettingsModule } from '../settings/settings.module';
import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [SettingsModule, FeaturesModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionsRepository],
  exports: [PromotionsService],
})
export class PromotionsModule {}
