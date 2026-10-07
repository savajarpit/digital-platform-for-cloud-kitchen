import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { QueryMealsDto } from './dto/query-meals.dto';
import { QueryAdminMealsDto } from './dto/query-admin-meals.dto';
import { Meal, Prisma } from '../../generated/prisma';
import { PromotionsService } from '../promotions/promotions.service';
import { AddonGroupsService } from '../addons/addon-groups.service';
import { AddonGroupWithItems } from '../addons/addon-groups.repository';
import { FeaturesService } from '../features/features.service';
import { MENU_ADDONS_FEATURE_KEY } from '../addons/addons.constants';
import { PaginationService } from '../../common/services/pagination.service';
import { MealStockService } from './meal-stock.service';
import { mealInPlansMessage } from './meal-plan-usage.util';

export type MealWithPromotion = Meal & {
  activePromotion: { promotionName: string; discountPercentage: number } | null;
};

export type MealWithAddons = Meal & { addonGroups?: AddonGroupWithItems[] };

/** Plates left today (tenant-local) — null when the meal has no daily
 * limit. The storefront badges "Only N left" / "Sold out today" from it. */
type WithRemainingToday<T> = T & { remainingToday: number | null };

@Injectable()
export class MealsService {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly promotionsService: PromotionsService,
    private readonly addonGroupsService: AddonGroupsService,
    private readonly featuresService: FeaturesService,
    private readonly pagination: PaginationService,
    private readonly mealStock: MealStockService,
  ) {}

  async findAllForAdmin(tenantId: string, query: QueryAdminMealsDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.menuRepo.findMealsPaginated(
      tenantId,
      {
        categoryId: query.categoryId,
        search: query.search,
        onlyAvailable: false,
        isVegetarian: query.isVegetarian,
        isPopular: query.isPopular,
      },
      skip,
      query.limit,
    );
    // Lightweight — just which groups are attached (so the edit form's
    // checkboxes reflect reality), never the nested items themselves; the
    // admin's own Add-on Groups screen is the source for those. Only worth
    // the extra query when the tenant actually has the feature.
    const hasAddons = await this.featuresService.hasFeature(
      tenantId,
      MENU_ADDONS_FEATURE_KEY,
    );
    const attachedByMeal = hasAddons
      ? await this.addonGroupsService.findAttachedGroupsForMeals(
          tenantId,
          data.map((m) => m.id),
        )
      : null;
    const remainingToday = await this.remainingToday(tenantId, data);
    return {
      data: data.map((meal) => ({
        ...meal,
        remainingToday: remainingToday.get(meal.id) ?? null,
        addonGroupIds: attachedByMeal
          ? (attachedByMeal.get(meal.id) ?? []).map((g) => g.id)
          : undefined,
      })),
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  async findAll(
    tenantId: string,
    query: QueryMealsDto,
    onlyAvailable: boolean,
  ): Promise<
    Meal[] | WithRemainingToday<MealWithPromotion | MealWithAddons>[]
  > {
    const meals = await this.menuRepo.findMeals(tenantId, {
      ...query,
      onlyAvailable,
    });
    // Promo badges and add-ons are storefront-only concerns — the admin
    // listing (onlyAvailable: false) doesn't need either.
    if (!onlyAvailable) return meals;

    const [promoMap, addonsByMeal, remainingToday] = await Promise.all([
      this.promotionsService.getActiveScheduledDiscountsForMeals(
        tenantId,
        meals,
      ),
      this.getAddonGroupsForMeals(tenantId, meals),
      this.remainingToday(tenantId, meals),
    ]);
    return meals.map((meal) => ({
      ...meal,
      activePromotion: promoMap.get(meal.id) ?? null,
      remainingToday: remainingToday.get(meal.id) ?? null,
      ...(addonsByMeal ? { addonGroups: addonsByMeal.get(meal.id) ?? [] } : {}),
    }));
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<WithRemainingToday<MealWithPromotion | MealWithAddons>> {
    const meal = await this.menuRepo.findMealById(tenantId, id);
    if (!meal) throw new NotFoundException('Meal not found');
    // Public single-meal fetch backs the customer detail page, so it needs
    // the same discount badge/price the grid already computes — findAll's
    // onlyAvailable path and this one must never disagree on price.
    const [promoMap, addonsByMeal, remainingToday] = await Promise.all([
      this.promotionsService.getActiveScheduledDiscountsForMeals(tenantId, [
        meal,
      ]),
      this.getAddonGroupsForMeals(tenantId, [meal]),
      this.remainingToday(tenantId, [meal]),
    ]);
    return {
      ...meal,
      activePromotion: promoMap.get(meal.id) ?? null,
      remainingToday: remainingToday.get(meal.id) ?? null,
      ...(addonsByMeal ? { addonGroups: addonsByMeal.get(meal.id) ?? [] } : {}),
    };
  }

  /** Checkout's per-date view of the same stock — every available meal
   * that has a daily limit, with what's left for `dateStr`. */
  async getStockForDate(
    tenantId: string,
    dateStr: string,
  ): Promise<{ date: string; meals: { mealId: string; remaining: number }[] }> {
    const meals = await this.menuRepo.findMeals(tenantId, {
      onlyAvailable: true,
    });
    const remaining = await this.mealStock.getRemaining(
      tenantId,
      meals,
      dateStr,
    );
    return {
      date: dateStr,
      meals: [...remaining].map(([mealId, left]) => ({
        mealId,
        remaining: left,
      })),
    };
  }

  /** Skips the timezone lookup and order query entirely when no meal in
   * the list has a daily limit — the common case. */
  private async remainingToday(
    tenantId: string,
    meals: Meal[],
  ): Promise<Map<string, number>> {
    if (meals.every((meal) => meal.dailyQuantityLimit === null)) {
      return new Map();
    }
    const today = await this.mealStock.getTenantToday(tenantId);
    return this.mealStock.getRemaining(tenantId, meals, today);
  }

  /** Never fetches (or returns) anything unless the tenant actually has the
   * menu-addons feature — a disabled tenant's storefront must never see
   * add-on data at all, not just have it hidden client-side. Returns null
   * (not an empty map) when disabled, so callers can tell "feature off"
   * apart from "no groups attached" and omit the field entirely. */
  private async getAddonGroupsForMeals(
    tenantId: string,
    meals: Meal[],
  ): Promise<Map<string, AddonGroupWithItems[]> | null> {
    const hasAddons = await this.featuresService.hasFeature(
      tenantId,
      MENU_ADDONS_FEATURE_KEY,
    );
    if (!hasAddons) return null;
    return this.addonGroupsService.findAttachedGroupsForMeals(
      tenantId,
      meals.map((m) => m.id),
    );
  }

  async setAddonGroups(
    tenantId: string,
    mealId: string,
    addonGroupIds: string[],
  ): Promise<void> {
    const meal = await this.menuRepo.findMealById(tenantId, mealId);
    if (!meal) throw new NotFoundException('Meal not found');
    await this.addonGroupsService.setMealAddonGroups(
      tenantId,
      mealId,
      addonGroupIds,
    );
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
    // Plans read their meals directly, deleted or not, so a deleted meal
    // would keep reaching subscribers and the kitchen. Arpit's call
    // (2026-10-04): refuse until it's swapped out of every plan.
    const usages = await this.menuRepo.findPlanSlotsUsingMeal(tenantId, id);
    const inPlans = mealInPlansMessage(meal.name, usages);
    if (inPlans) throw new ConflictException(inPlans);
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
