import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Coupon,
  Meal,
  Prisma,
  Promotion,
  PromotionType,
} from '../../generated/prisma';

@Injectable()
export class PromotionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCoupons(tenantId: string): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findCouponById(tenantId: string, id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({ where: { id, tenantId } });
  }

  createCoupon(
    tenantId: string,
    data: Omit<Prisma.CouponUncheckedCreateInput, 'tenantId'>,
  ): Promise<Coupon> {
    return this.prisma.coupon.create({ data: { ...data, tenantId } });
  }

  updateCoupon(
    id: string,
    data: Prisma.CouponUncheckedUpdateInput,
  ): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  deleteCoupon(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  findPromotions(tenantId: string): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPromotionById(tenantId: string, id: string): Promise<Promotion | null> {
    return this.prisma.promotion.findFirst({ where: { id, tenantId } });
  }

  createPromotion(
    tenantId: string,
    data: Omit<Prisma.PromotionUncheckedCreateInput, 'tenantId'>,
  ): Promise<Promotion> {
    return this.prisma.promotion.create({ data: { ...data, tenantId } });
  }

  updatePromotion(
    id: string,
    data: Prisma.PromotionUncheckedUpdateInput,
  ): Promise<Promotion> {
    return this.prisma.promotion.update({ where: { id }, data });
  }

  deletePromotion(id: string): Promise<Promotion> {
    return this.prisma.promotion.delete({ where: { id } });
  }

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

  /** Only redemptions whose order went past checkout count toward usage
   * limits — the row is written when the order is created, before payment,
   * so an abandoned or failed payment must not burn a one-per-customer (or
   * limited-quantity) coupon. */
  countCouponRedemptions(
    tenantId: string,
    couponId: string,
    userId?: string,
  ): Promise<number> {
    return this.prisma.couponRedemption.count({
      where: {
        tenantId,
        couponId,
        ...(userId ? { userId } : {}),
        order: { status: { not: 'PENDING_PAYMENT' } },
      },
    });
  }

  countPlanCouponRedemptions(
    tenantId: string,
    couponId: string,
    userId?: string,
  ): Promise<number> {
    // Same rule as countCouponRedemptions: an unpaid signup doesn't count.
    return this.prisma.planCouponRedemption.count({
      where: {
        tenantId,
        couponId,
        ...(userId ? { userId } : {}),
        subscription: { status: { not: 'PENDING_PAYMENT' } },
      },
    });
  }

  createPlanCouponRedemption(
    tenantId: string,
    couponId: string,
    userId: string,
    subscriptionId: string,
  ) {
    return this.prisma.planCouponRedemption.create({
      data: { tenantId, couponId, userId, subscriptionId },
    });
  }

  /** Active PLAN_BONUS_DAYS promotions storewide-among-plans (empty planIds)
   * or scoped to this specific plan. */
  findActivePlanBonusPromotions(
    tenantId: string,
    planId: string,
  ): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: {
        tenantId,
        type: 'PLAN_BONUS_DAYS',
        isActive: true,
        OR: [{ planIds: { isEmpty: true } }, { planIds: { has: planId } }],
      },
    });
  }

  /** Raw lookup for promotion buy/get/free meal targets — deliberately
   * bypasses MealsService to avoid a MenuModule <-> PromotionsModule cycle
   * (MenuModule needs PromotionsService for the storefront badge). */
  findMealsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<
    Pick<Meal, 'id' | 'name' | 'priceInPaise' | 'isAvailable' | 'categoryId'>[]
  > {
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
