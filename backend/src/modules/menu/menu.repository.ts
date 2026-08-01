import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Category, Meal, Prisma } from '../../generated/prisma';

export interface MealFilter {
  categoryId?: string;
  search?: string;
  onlyAvailable: boolean;
}

@Injectable()
export class MenuRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCategories(tenantId: string, onlyActive: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { tenantId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findCategoryById(tenantId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id, tenantId } });
  }

  findCategoryBySlug(tenantId: string, slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  createCategory(
    tenantId: string,
    data: Omit<Prisma.CategoryUncheckedCreateInput, 'tenantId'>,
  ): Promise<Category> {
    return this.prisma.category.create({ data: { ...data, tenantId } });
  }

  updateCategory(
    id: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  deleteCategory(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  findMeals(tenantId: string, filter: MealFilter): Promise<Meal[]> {
    return this.prisma.meal.findMany({
      where: mealWhere(tenantId, filter),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: true },
    });
  }

  async findMealsPaginated(
    tenantId: string,
    filter: MealFilter,
    skip: number,
    take: number,
  ): Promise<[Meal[], number]> {
    const where = mealWhere(tenantId, filter);
    return this.prisma.$transaction([
      this.prisma.meal.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { category: true },
      }),
      this.prisma.meal.count({ where }),
    ]);
  }

  findMealById(tenantId: string, id: string): Promise<Meal | null> {
    return this.prisma.meal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { category: true },
    });
  }

  findMealsByIds(tenantId: string, ids: string[]): Promise<Meal[]> {
    return this.prisma.meal.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
    });
  }

  createMeal(
    tenantId: string,
    data: Omit<Prisma.MealUncheckedCreateInput, 'tenantId'>,
  ): Promise<Meal> {
    return this.prisma.meal.create({ data: { ...data, tenantId } });
  }

  updateMeal(id: string, data: Prisma.MealUncheckedUpdateInput): Promise<Meal> {
    return this.prisma.meal.update({ where: { id }, data });
  }

  softDeleteMeal(id: string): Promise<Meal> {
    return this.prisma.meal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

function mealWhere(
  tenantId: string,
  filter: MealFilter,
): Prisma.MealWhereInput {
  return {
    tenantId,
    deletedAt: null,
    ...(filter.onlyAvailable ? { isAvailable: true } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter.search
      ? { name: { contains: filter.search, mode: 'insensitive' } }
      : {}),
  };
}
