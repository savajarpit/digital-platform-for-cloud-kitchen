import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { MealsController } from './meals.controller';
import { CategoriesService } from './categories.service';
import { MealsService } from './meals.service';
import { MenuRepository } from './menu.repository';

@Module({
  controllers: [CategoriesController, MealsController],
  providers: [CategoriesService, MealsService, MenuRepository],
})
export class MenuModule {}
