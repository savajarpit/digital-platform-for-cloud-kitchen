import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { QueryMealsDto } from './dto/query-meals.dto';
import { Meal, Prisma } from '../../generated/prisma';
import { PromotionsService } from '../promotions/promotions.service';

export type MealWithPromotion = Meal & {
  activePromotion: { promotionName: string; discountPercentage: number } | null;
};

@Injectable()
export class MealsService {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly promotionsService: PromotionsService,
  ) {}

  async findAll(
    tenantId: string,
    query: QueryMealsDto,
    onlyAvailable: boolean,
  ): Promise<Meal[] | MealWithPromotion[]> {
    const meals = await this.menuRepo.findMeals(tenantId, {
      ...query,
      onlyAvailable,
    });
    // Promo badges are a storefront-only concern — the admin listing
    // (onlyAvailable: false) doesn't need them.
    if (!onlyAvailable) return meals;

    const promoMap = await this.promotionsService.getActiveScheduledDiscountsForMeals(
      tenantId,
      meals,
    );
    return meals.map((meal) => ({
      ...meal,
      activePromotion: promoMap.get(meal.id) ?? null,
    }));
  }

  async findOne(tenantId: string, id: string): Promise<Meal> {
    const meal = await this.menuRepo.findMealById(tenantId, id);
    if (!meal) throw new NotFoundException('Meal not found');
    return meal;
  }

  findByIds(tenantId: string, ids: string[]): Promise<Meal[]> {
    return this.menuRepo.findMealsByIds(tenantId, ids);
  }

  async create(tenantId: string, dto: CreateMealDto): Promise<Meal> {
    if (dto.categoryId) {
      await this.assertCategoryBelongsToTenant(tenantId, dto.categoryId);
    }
    return this.menuRepo.createMeal(tenantId, {
      ...dto,
      nutrition: dto.nutrition as Prisma.InputJsonValue,
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateMealDto,
  ): Promise<Meal> {
    const meal = await this.menuRepo.findMealById(tenantId, id);
    if (!meal) throw new NotFoundException('Meal not found');
    if (dto.categoryId) {
      await this.assertCategoryBelongsToTenant(tenantId, dto.categoryId);
    }
    return this.menuRepo.updateMeal(id, {
      ...dto,
      nutrition: dto.nutrition as Prisma.InputJsonValue,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const meal = await this.menuRepo.findMealById(tenantId, id);
    if (!meal) throw new NotFoundException('Meal not found');
    await this.menuRepo.softDeleteMeal(id);
  }

  private async assertCategoryBelongsToTenant(
    tenantId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.menuRepo.findCategoryById(tenantId, categoryId);
    if (!category) throw new NotFoundException('Category not found');
  }
}
