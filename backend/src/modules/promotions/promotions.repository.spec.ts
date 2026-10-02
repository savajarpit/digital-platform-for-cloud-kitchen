import { PromotionsRepository } from './promotions.repository';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('PromotionsRepository — coupon usage counts', () => {
  const couponCount = jest.fn().mockResolvedValue(0);
  const planCount = jest.fn().mockResolvedValue(0);
  const repo = new PromotionsRepository({
    couponRedemption: { count: couponCount },
    planCouponRedemption: { count: planCount },
  } as unknown as PrismaService);

  it('ignores redemptions on orders still awaiting payment', async () => {
    await repo.countCouponRedemptions('t1', 'c1', 'u1');
    expect(couponCount).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        couponId: 'c1',
        userId: 'u1',
        order: { status: { not: 'PENDING_PAYMENT' } },
      },
    });
  });

  it('ignores plan redemptions on unpaid subscriptions', async () => {
    await repo.countPlanCouponRedemptions('t1', 'c1');
    expect(planCount).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        couponId: 'c1',
        subscription: { status: { not: 'PENDING_PAYMENT' } },
      },
    });
  });
});
