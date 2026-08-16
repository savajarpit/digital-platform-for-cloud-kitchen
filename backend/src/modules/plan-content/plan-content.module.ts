import { Module } from '@nestjs/common';
import { PlanFeaturesController } from './plan-features.controller';
import { PlanFaqsController } from './plan-faqs.controller';
import { PlanContentService } from './plan-content.service';
import { PlanContentRepository } from './plan-content.repository';

@Module({
  controllers: [PlanFeaturesController, PlanFaqsController],
  providers: [PlanContentService, PlanContentRepository],
})
export class PlanContentModule {}
