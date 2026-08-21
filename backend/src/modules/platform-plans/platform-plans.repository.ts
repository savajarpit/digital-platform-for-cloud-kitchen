import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformPlan, Prisma } from '../../generated/prisma';

@Injectable()
export class PlatformPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformPlan[]> {
    return this.prisma.platformPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  findPublished(): Promise<PlatformPlan[]> {
    return this.prisma.platformPlan.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(id: string): Promise<PlatformPlan | null> {
    return this.prisma.platformPlan.findUnique({ where: { id } });
  }

  create(data: Prisma.PlatformPlanUncheckedCreateInput): Promise<PlatformPlan> {
    return this.prisma.platformPlan.create({ data });
  }

  update(
    id: string,
    data: Prisma.PlatformPlanUncheckedUpdateInput,
  ): Promise<PlatformPlan> {
    return this.prisma.platformPlan.update({ where: { id }, data });
  }

  delete(id: string): Promise<PlatformPlan> {
    return this.prisma.platformPlan.delete({ where: { id } });
  }

  /** Both FKs (planId/scheduledPlanId) are ON DELETE SET NULL — deleting a
   * referenced plan wouldn't fail at the DB level, it would silently null
   * out an active subscription's plan link (breaking its usage-cap
   * enforcement) or forget a scheduled downgrade mid-flight. Checked
   * explicitly before allowing a delete rather than relying on the
   * cascade. Queries platformSubscription directly rather than importing
   * PlatformBillingRepository, to avoid a circular module dependency
   * (platform-billing already depends on platform-plans, not the reverse). */
  countSubscriptionsReferencing(planId: string): Promise<number> {
    return this.prisma.platformSubscription.count({
      where: { OR: [{ planId }, { scheduledPlanId: planId }] },
    });
  }
}
