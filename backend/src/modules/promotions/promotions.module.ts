import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsRepository } from './promotions.repository';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [PromotionsService, PromotionsRepository],
  exports: [PromotionsService],
})
export class PromotionsModule {}
