import { BadRequestException, ConflictException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsRepository } from './promotions.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { FeaturesService } from '../features/features.service';

const repo = {
  createCoupon: jest.fn(),
  findActivePromotionsByTypes: jest.fn(),
  findMealsByIds: jest.fn(),
  findCouponByCode: jest.fn(),
  findActivePlanBonusPromotions: jest.fn(),
  countCouponRedemptions: jest.fn(),
  countPlanCouponRedemptions: jest.fn(),
};
const settingsRepo = { findBusinessProfile: jest.fn() };
const features = { hasFeature: jest.fn() };

function build(): PromotionsService {
  return new PromotionsService(
    repo as unknown as PromotionsRepository,
    settingsRepo as unknown as SettingsRepository,
    features as unknown as FeaturesService,
  );
}

/** An all-day, every-day storewide 10% scheduled discount. */
function discount(appliesTo: 'ORDERS' | 'PLANS' | 'BOTH') {
  return {
    id: `p-${appliesTo}`,
    name: `promo ${appliesTo}`,
    type: 'SCHEDULED_DISCOUNT',
    isActive: true,
    appliesTo,
    discountPercentage: 10,
    daysOfWeek: [],
    startTime: '00:00',
    endTime: '23:59',
    storewide: true,
    mealIds: [],
    categoryIds: [],
    planIds: [],
  };
}

const meal = {
  id: 'm1',
  name: 'Salad',
  priceInPaise: 24900,
  categoryId: null,
  isAvailable: true,
};
const cartItems = [
  {
    mealId: 'm1',
    nameSnapshot: 'Salad',
    priceInPaiseSnapshot: 24900,
    quantity: 1,
  },
];

function cartDiscount(service: PromotionsService): Promise<number> {
  return service
    .computeCartPromotions(
      't1',
      cartItems as never,
      new Map([['m1', meal]]) as never,
      24900,
    )
    .then((r) => r.discountInPaise);
}

describe('PromotionsService — entitlement and appliesTo scope', () => {
  let service: PromotionsService;

  beforeEach(() => {
    service = build();
    settingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    repo.findMealsByIds.mockResolvedValue([]);
    features.hasFeature.mockResolvedValue(true);
  });

  afterEach(() => jest.resetAllMocks());

  describe('with the promotions feature revoked', () => {
    beforeEach(() => features.hasFeature.mockResolvedValue(false));

    it('applies no cart discount even if promotions still exist', async () => {
      repo.findActivePromotionsByTypes.mockResolvedValue([discount('ORDERS')]);
      await expect(cartDiscount(service)).resolves.toBe(0);
      expect(repo.findActivePromotionsByTypes).not.toHaveBeenCalled();
    });

    it('shows no meal or plan badges and grants no bonus days', async () => {
      await expect(
        service.getActiveScheduledDiscountsForMeals('t1', [meal]),
      ).resolves.toEqual(new Map());
      await expect(
        service.getActiveScheduledDiscountsForPlans('t1', ['plan1']),
      ).resolves.toEqual(new Map());
      await expect(
        service.getApplicablePlanBonusDays('t1', 'plan1', 30),
      ).resolves.toBe(0);
    });

    it('rejects order and plan coupons', async () => {
      await expect(
        service.validateCoupon('t1', 'SAVE10', 'u1', 50000),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.validatePlanCoupon('t1', 'SAVE10', 'u1', 50000),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findCouponByCode).not.toHaveBeenCalled();
    });
  });

  describe('appliesTo scope', () => {
    it('never discounts a meal order with a plans-only promotion', async () => {
      repo.findActivePromotionsByTypes.mockResolvedValue([discount('PLANS')]);
      await expect(cartDiscount(service)).resolves.toBe(0);
      await expect(
        service.getActiveScheduledDiscountsForMeals('t1', [meal]),
      ).resolves.toEqual(new Map());
    });

    it.each(['ORDERS', 'BOTH'] as const)(
      'discounts a meal order with an %s promotion',
      async (appliesTo) => {
        repo.findActivePromotionsByTypes.mockResolvedValue([
          discount(appliesTo),
        ]);
        await expect(cartDiscount(service)).resolves.toBe(2490);
        const badges = await service.getActiveScheduledDiscountsForMeals('t1', [
          meal,
        ]);
        expect(badges.get('m1')?.discountPercentage).toBe(10);
      },
    );

    it.each([
      ['PLANS', true],
      ['BOTH', true],
      ['ORDERS', false],
    ] as const)(
      'a %s promotion applies to plans: %s',
      async (appliesTo, applies) => {
        repo.findActivePromotionsByTypes.mockResolvedValue([
          discount(appliesTo),
        ]);
        const badges = await service.getActiveScheduledDiscountsForPlans('t1', [
          'plan1',
        ]);
        expect(badges.has('plan1')).toBe(applies);
      },
    );
  });

  describe('coupons', () => {
    const coupon = {
      id: 'c1',
      code: 'BIG',
      isActive: true,
      appliesTo: 'ORDERS',
      discountType: 'FLAT',
      discountValue: 30000,
      minOrderAmountInPaise: 0,
      maxUsesTotal: null,
      maxUsesPerUser: null,
      validFrom: null,
      validUntil: null,
    };

    it('never discounts more than the subtotal (flat and percentage)', async () => {
      repo.findCouponByCode.mockResolvedValue(coupon);
      await expect(
        service.validateCoupon('t1', 'BIG', 'u1', 24900),
      ).resolves.toMatchObject({ discountInPaise: 24900 });
      repo.findCouponByCode.mockResolvedValue({
        ...coupon,
        discountType: 'PERCENTAGE',
        discountValue: 150,
      });
      await expect(
        service.validateCoupon('t1', 'BIG', 'u1', 24900),
      ).resolves.toMatchObject({ discountInPaise: 24900 });
    });

    it('rejects a percentage coupon above 100%', async () => {
      await expect(
        service.createCoupon('t1', {
          code: 'X',
          discountType: 'PERCENTAGE',
          discountValue: 101,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.createCoupon).not.toHaveBeenCalled();
    });

    it('returns a conflict for a duplicate code (any case)', async () => {
      repo.findCouponByCode.mockResolvedValue(coupon);
      await expect(
        service.createCoupon('t1', {
          code: ' big ',
          discountType: 'FLAT',
          discountValue: 100,
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.findCouponByCode).toHaveBeenCalledWith('t1', 'BIG');
    });
  });
});
