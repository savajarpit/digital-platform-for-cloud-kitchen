import { BadRequestException, Injectable } from '@nestjs/common';
import { PromotionsRepository } from './promotions.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { DateUtil } from '../../common/utils/date.util';
import { Promotion, PromotionType } from '../../generated/prisma';
import { OrderItemInput } from '../orders/orders.repository';

export interface CartMeal {
  id: string;
  name: string;
  categoryId: string | null;
  priceInPaise: number;
  isAvailable: boolean;
}

export interface CartPromotionsResult {
  /** Free items to append to the order — priceInPaiseSnapshot is the real
   * retail price (not 0); their value is recovered via discountInPaise. */
  extraItems: OrderItemInput[];
  discountInPaise: number;
}

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountInPaise: number;
}

const SCHEDULED_DISCOUNT_SCOPE_TYPES: PromotionType[] = ['SCHEDULED_DISCOUNT'];
const AUTOMATIC_TYPES: PromotionType[] = [
  'BOGO',
  'FREE_ITEM_ON_MINIMUM',
  'SCHEDULED_DISCOUNT',
];

@Injectable()
export class PromotionsService {
  constructor(
    private readonly promotionsRepo: PromotionsRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  /**
   * Computes every automatic (no-code) promotion for a cart: scheduled
   * per-item percentage discounts, BOGO free units, and free-item-on-minimum
   * — all recomputed server-side, never trusting anything the client showed.
   */
  async computeCartPromotions(
    tenantId: string,
    cartItems: OrderItemInput[],
    mealsById: Map<string, CartMeal>,
    rawSubtotalInPaise: number,
  ): Promise<CartPromotionsResult> {
    const [promotions, timezone] = await Promise.all([
      this.promotionsRepo.findActivePromotionsByTypes(tenantId, AUTOMATIC_TYPES),
      this.getTenantTimezone(tenantId),
    ]);

    let discountInPaise = 0;

    // Scheduled percentage discounts — reduce discountInPaise per matching
    // cart item, without touching its snapshot price.
    const scheduledPromos = promotions.filter(
      (p) => p.type === 'SCHEDULED_DISCOUNT' && this.isWithinWindow(p, timezone),
    );
    if (scheduledPromos.length > 0) {
      for (const item of cartItems) {
        const meal = item.mealId ? mealsById.get(item.mealId) : undefined;
        if (!meal) continue;
        const bestPercentage = scheduledPromos
          .filter((p) => this.matchesScope(p, meal))
          .reduce((max, p) => Math.max(max, p.discountPercentage ?? 0), 0);
        if (bestPercentage > 0) {
          discountInPaise += Math.floor(
            (item.priceInPaiseSnapshot * item.quantity * bestPercentage) / 100,
          );
        }
      }
    }

    // Collect candidate buy/get/free meal ids not already known from the
    // cart, so BOGO/free-item promotions can be applied even when the free
    // meal isn't something the customer added themselves.
    const bogoPromos = promotions.filter((p) => p.type === 'BOGO' && p.buyMealId);
    const freeItemPromos = promotions.filter(
      (p) => p.type === 'FREE_ITEM_ON_MINIMUM' && p.freeMealId,
    );
    const candidateIds = new Set<string>();
    for (const p of bogoPromos) {
      if (p.getMealId) candidateIds.add(p.getMealId);
      else if (p.buyMealId) candidateIds.add(p.buyMealId);
    }
    for (const p of freeItemPromos) {
      if (p.freeMealId) candidateIds.add(p.freeMealId);
    }
    const missingIds = [...candidateIds].filter((id) => !mealsById.has(id));
    const fetchedMeals = await this.promotionsRepo.findMealsByIds(tenantId, missingIds);
    const targetMealsById = new Map<string, CartMeal>([
      ...mealsById.entries(),
      ...fetchedMeals.map((m) => [m.id, m] as const),
    ]);

    const extraItems: OrderItemInput[] = [];

    for (const promo of bogoPromos) {
      const buyMealId = promo.buyMealId as string;
      const cartItem = cartItems.find((i) => i.mealId === buyMealId);
      const buyQuantity = promo.buyQuantity ?? 1;
      if (!cartItem || cartItem.quantity < buyQuantity) continue;

      const getMealId = promo.getMealId ?? buyMealId;
      const getMeal = targetMealsById.get(getMealId);
      if (!getMeal || !getMeal.isAvailable) continue;

      const getQuantity = promo.getQuantity ?? buyQuantity;
      const freeUnits = Math.floor(cartItem.quantity / buyQuantity) * getQuantity;
      if (freeUnits <= 0) continue;

      extraItems.push({
        mealId: getMeal.id,
        nameSnapshot: getMeal.name,
        priceInPaiseSnapshot: getMeal.priceInPaise,
        quantity: freeUnits,
        isFreeItem: true,
      });
      discountInPaise += getMeal.priceInPaise * freeUnits;
    }

    // Only the single best-matching tier applies, to avoid stacking
    // multiple free-item tiers on one order.
    const bestFreeItemPromo = freeItemPromos
      .filter((p) => rawSubtotalInPaise >= (p.minOrderAmountInPaise ?? Infinity))
      .sort((a, b) => (b.minOrderAmountInPaise ?? 0) - (a.minOrderAmountInPaise ?? 0))[0];
    if (bestFreeItemPromo) {
      const freeMeal = targetMealsById.get(bestFreeItemPromo.freeMealId as string);
      if (freeMeal?.isAvailable) {
        extraItems.push({
          mealId: freeMeal.id,
          nameSnapshot: freeMeal.name,
          priceInPaiseSnapshot: freeMeal.priceInPaise,
          quantity: 1,
          isFreeItem: true,
        });
        discountInPaise += freeMeal.priceInPaise;
      }
    }

    return { extraItems, discountInPaise };
  }

  async validateCoupon(
    tenantId: string,
    code: string,
    userId: string,
    subtotalInPaise: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.promotionsRepo.findCouponByCode(tenantId, code);
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid coupon code');
    }
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('This coupon has expired');
    }
    if (subtotalInPaise < coupon.minOrderAmountInPaise) {
      throw new BadRequestException(
        `This coupon requires a minimum order of ₹${(coupon.minOrderAmountInPaise / 100).toFixed(0)}`,
      );
    }
    if (coupon.maxUsesTotal != null) {
      const totalUses = await this.promotionsRepo.countCouponRedemptions(
        tenantId,
        coupon.id,
      );
      if (totalUses >= coupon.maxUsesTotal) {
        throw new BadRequestException('This coupon has reached its usage limit');
      }
    }
    if (coupon.maxUsesPerUser != null) {
      const userUses = await this.promotionsRepo.countCouponRedemptions(
        tenantId,
        coupon.id,
        userId,
      );
      if (userUses >= coupon.maxUsesPerUser) {
        throw new BadRequestException(
          'You have already used this coupon the maximum number of times',
        );
      }
    }

    const discountInPaise =
      coupon.discountType === 'PERCENTAGE'
        ? Math.floor((subtotalInPaise * coupon.discountValue) / 100)
        : Math.min(coupon.discountValue, subtotalInPaise);

    return { couponId: coupon.id, code: coupon.code, discountInPaise };
  }

  /** Active SCHEDULED_DISCOUNT promotion per meal, for the storefront badge. */
  async getActiveScheduledDiscountsForMeals(
    tenantId: string,
    meals: { id: string; categoryId: string | null }[],
  ): Promise<Map<string, { promotionName: string; discountPercentage: number }>> {
    const [promotions, timezone] = await Promise.all([
      this.promotionsRepo.findActivePromotionsByTypes(
        tenantId,
        SCHEDULED_DISCOUNT_SCOPE_TYPES,
      ),
      this.getTenantTimezone(tenantId),
    ]);
    const activeNow = promotions.filter((p) => this.isWithinWindow(p, timezone));

    const result = new Map<string, { promotionName: string; discountPercentage: number }>();
    for (const meal of meals) {
      const best = activeNow
        .filter((p) => this.matchesScope(p, meal))
        .sort((a, b) => (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0))[0];
      if (best) {
        result.set(meal.id, {
          promotionName: best.name,
          discountPercentage: best.discountPercentage ?? 0,
        });
      }
    }
    return result;
  }

  private async getTenantTimezone(tenantId: string): Promise<string> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return profile?.timezone ?? 'Asia/Kolkata';
  }

  private matchesScope(
    promo: Promotion,
    meal: { id: string; categoryId: string | null },
  ): boolean {
    if (promo.storewide) return true;
    if (promo.mealIds.includes(meal.id)) return true;
    if (meal.categoryId && promo.categoryIds.includes(meal.categoryId)) return true;
    return false;
  }

  /** Empty daysOfWeek is treated as "every day" — the common case for an admin who just wants a daily happy-hour window. */
  private isWithinWindow(promo: Promotion, timezone: string): boolean {
    if (!promo.startTime || !promo.endTime) return false;
    const dayOfWeek = DateUtil.getTenantDayOfWeek(timezone);
    if (promo.daysOfWeek.length > 0 && !promo.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    const { minutesSinceMidnight } = DateUtil.getTenantNow(timezone);
    const startMinutes = DateUtil.hhmmToMinutes(promo.startTime);
    const endMinutes = DateUtil.hhmmToMinutes(promo.endTime);
    return minutesSinceMidnight >= startMinutes && minutesSinceMidnight < endMinutes;
  }
}
