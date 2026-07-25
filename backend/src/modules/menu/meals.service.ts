import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { QueryMealsDto } from './dto/query-meals.dto';
import { Meal, Prisma } from '../../generated/prisma';

@Injectable()
export class MealsService {
  constructor(private readonly menuRepo: MenuRepository) {}

  findAll(
    tenantId: string,
    query: QueryMealsDto,
    onlyAvailable: boolean,
  ): Promise<Meal[]> {
    return this.menuRepo.findMeals(tenantId, { ...query, onlyAvailable });
  }

  async findOne(tenantId: string, id: string): Promise<Meal> {
    const meal = await this.menuRepo.findMealById(tenantId, id);
    if (!meal) throw new NotFoundException('Meal not found');
    return meal;
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
