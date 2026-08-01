import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { MealsController } from './meals.controller';
import { CategoriesService } from './categories.service';
import { MealsService } from './meals.service';
import { MenuRepository } from './menu.repository';
import { PromotionsModule } from '../promotions/promotions.module';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  imports: [PromotionsModule],
  controllers: [CategoriesController, MealsController],
  providers: [
    CategoriesService,
    MealsService,
    MenuRepository,
    PaginationService,
  ],
  exports: [MealsService],
})
export class MenuModule {}
