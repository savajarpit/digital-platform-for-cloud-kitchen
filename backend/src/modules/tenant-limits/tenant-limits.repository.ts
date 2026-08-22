import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  OrderStatus,
  Role,
  SubscriptionStatus,
  TenantLimits,
} from '../../generated/prisma';

@Injectable()
export class TenantLimitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenantId(tenantId: string): Promise<TenantLimits | null> {
    return this.prisma.tenantLimits.findUnique({ where: { tenantId } });
  }

  upsert(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<TenantLimits> {
    return this.prisma.tenantLimits.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
  }

  /** Real, paid orders only — excludes abandoned PENDING_PAYMENT checkouts, same convention already used for customer orderCount. */
  countMonthlyOrders(
    tenantId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    return this.prisma.order.count({
      where: {
        tenantId,
        status: { not: OrderStatus.PENDING_PAYMENT },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    });
  }

  countActiveSubscribers(tenantId: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { tenantId, status: SubscriptionStatus.ACTIVE },
    });
  }

  countMonthlySignups(
    tenantId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    return this.prisma.user.count({
      where: {
        tenantId,
        role: Role.CUSTOMER,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    });
  }

  /** The plan defaults a tenant's caps fall back to when no override is set — null if the tenant has no PlatformSubscription or it has no PlatformPlan attached (comped/custom deal). */
  findPlanDefaults(tenantId: string) {
    return this.prisma.platformSubscription.findUnique({
      where: { tenantId },
      include: { plan: true, scheduledPlan: { select: { name: true } } },
    });
  }

  async findTenantName(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    return tenant?.name ?? null;
  }
}
