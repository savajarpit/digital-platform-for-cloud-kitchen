import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { MealsController } from './meals.controller';
import { CategoriesService } from './categories.service';
import { MealsService } from './meals.service';
import { MenuRepository } from './menu.repository';
import { MealStockRepository } from './meal-stock.repository';
import { MealStockService } from './meal-stock.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { AddonsModule } from '../addons/addons.module';
import { FeaturesModule } from '../features/features.module';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  imports: [PromotionsModule, AddonsModule, FeaturesModule],
  controllers: [CategoriesController, MealsController],
  providers: [
    CategoriesService,
    MealsService,
    MenuRepository,
    MealStockRepository,
    MealStockService,
    PaginationService,
  ],
  exports: [MealsService, MealStockService],
})
export class MenuModule {}
