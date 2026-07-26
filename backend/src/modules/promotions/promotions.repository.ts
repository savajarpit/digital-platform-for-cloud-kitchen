import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Coupon, Meal, Promotion, PromotionType } from '../../generated/prisma';

@Injectable()
export class PromotionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePromotionsByTypes(
    tenantId: string,
    types: PromotionType[],
  ): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: { tenantId, isActive: true, type: { in: types } },
    });
  }

  findCouponByCode(tenantId: string, code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.trim().toUpperCase() } },
    });
  }

  countCouponRedemptions(
    tenantId: string,
    couponId: string,
    userId?: string,
  ): Promise<number> {
    return this.prisma.couponRedemption.count({
      where: { tenantId, couponId, ...(userId ? { userId } : {}) },
    });
  }

  /** Raw lookup for promotion buy/get/free meal targets — deliberately
   * bypasses MealsService to avoid a MenuModule <-> PromotionsModule cycle
   * (MenuModule needs PromotionsService for the storefront badge). */
  findMealsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<Pick<Meal, 'id' | 'name' | 'priceInPaise' | 'isAvailable' | 'categoryId'>[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.meal.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        priceInPaise: true,
        isAvailable: true,
        categoryId: true,
      },
    });
  }
}
