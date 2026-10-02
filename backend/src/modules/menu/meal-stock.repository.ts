import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OrderStatus, PaymentMethod, Prisma } from '../../generated/prisma';
import { DateUtil } from '../../common/utils/date.util';

@Injectable()
export class MealStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTenantTimezone(tenantId: string): Promise<string> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return profile?.timezone ?? 'Asia/Kolkata';
  }

  /**
   * Plates of each meal already taken for one delivery date. Counts every
   * live order (manual/dine-in ones too, even before they're marked paid),
   * plus a Razorpay checkout still inside its payment hold — an abandoned
   * one stops counting after `holdSince`. Subscription deliveries are
   * excluded: they're planned in advance and never compete with the
   * day's à-la-carte stock.
   */
  async sumSoldForDate(
    tenantId: string,
    mealIds: string[],
    dateStr: string,
    holdSince: Date,
  ): Promise<Map<string, number>> {
    if (mealIds.length === 0) return new Map();
    const where: Prisma.OrderItemWhereInput = {
      mealId: { in: mealIds },
      order: {
        tenantId,
        subscriptionId: null,
        deliveryDate: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(
            `${DateUtil.addDaysToDateStr(dateStr, 1)}T00:00:00.000Z`,
          ),
        },
        status: { not: OrderStatus.CANCELLED },
        OR: [
          { status: { not: OrderStatus.PENDING_PAYMENT } },
          { paymentMethod: { not: PaymentMethod.RAZORPAY } },
          { createdAt: { gte: holdSince } },
        ],
      },
    };
    const rows = await this.prisma.orderItem.groupBy({
      by: ['mealId'],
      where,
      _sum: { quantity: true },
    });
    return new Map(
      rows
        .filter((row) => row.mealId !== null)
        .map((row) => [row.mealId as string, row._sum.quantity ?? 0]),
    );
  }
}
