import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CancellationRequestStatus,
  OrderStatus,
  Prisma,
} from '../../generated/prisma';
import { KITCHEN_QUERY_STATUSES } from './kitchen-rules';

export const KITCHEN_ORDER_INCLUDE = {
  user: { select: { firstName: true, lastName: true, email: true } },
  address: true,
  pickupKitchenZone: true,
  dineInKitchenZone: { select: { id: true, name: true } },
  subscription: { select: { planId: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      addons: { select: { nameSnapshot: true, quantity: true } },
      meal: { select: { category: { select: { id: true, name: true } } } },
    },
  },
  cancellationRequests: {
    where: { status: CancellationRequestStatus.PENDING },
    select: { id: true },
  },
} satisfies Prisma.OrderInclude;

export type KitchenOrderRow = Prisma.OrderGetPayload<{
  include: typeof KITCHEN_ORDER_INCLUDE;
}>;

@Injectable()
export class KitchenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every order the kitchen may care about whose delivery date falls in
   * [from, to) — the caller narrows it to one tenant-local day. */
  findOrdersInRange(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<KitchenOrderRow[]> {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        status: { in: KITCHEN_QUERY_STATUSES },
        deliveryDate: { gte: from, lt: to },
      },
      include: KITCHEN_ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  findOrderById(tenantId: string, id: string): Promise<KitchenOrderRow | null> {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: KITCHEN_ORDER_INCLUDE,
    });
  }

  /** Moves the order only if nobody else changed it since it was read —
   * false when two staff clicked at once (or the Orders page moved it). */
  async moveStatus(
    tenantId: string,
    id: string,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<boolean> {
    const { count } = await this.prisma.order.updateMany({
      where: { id, tenantId, status: from },
      data: { status: to },
    });
    return count === 1;
  }

  /** Subscriptions with a per-day change (address, time or note) on `date`. */
  async findChangedSubscriptionIds(
    subscriptionIds: string[],
    date: string,
  ): Promise<Set<string>> {
    if (subscriptionIds.length === 0) return new Set();
    const rows = await this.prisma.subscriptionDayOverride.findMany({
      where: { subscriptionId: { in: subscriptionIds }, date },
      select: { subscriptionId: true },
    });
    return new Set(rows.map((r) => r.subscriptionId));
  }

  findActiveSlots(tenantId: string) {
    return this.prisma.deliverySlot.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, startTime: true, endTime: true },
      orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
    });
  }

  findPlans(tenantId: string) {
    return this.prisma.subscriptionPlan.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTimezone(tenantId: string): Promise<string> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return profile?.timezone ?? 'Asia/Kolkata';
  }
}
