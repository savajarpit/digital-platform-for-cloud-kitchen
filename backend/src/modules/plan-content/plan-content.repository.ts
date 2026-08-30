import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlanFaq, PlanFeature, Prisma } from '../../generated/prisma';

@Injectable()
export class PlanContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Plan features ("Why subscribe?") ────────────────────

  findAllFeatures(tenantId: string): Promise<PlanFeature[]> {
    return this.prisma.planFeature.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findEnabledFeatures(tenantId: string): Promise<PlanFeature[]> {
    return this.prisma.planFeature.findMany({
      where: { tenantId, isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findFeatureById(tenantId: string, id: string): Promise<PlanFeature | null> {
    return this.prisma.planFeature.findFirst({ where: { id, tenantId } });
  }

  createFeature(
    tenantId: string,
    data: Omit<Prisma.PlanFeatureUncheckedCreateInput, 'tenantId'>,
  ): Promise<PlanFeature> {
    return this.prisma.planFeature.create({ data: { ...data, tenantId } });
  }

  updateFeature(
    id: string,
    data: Prisma.PlanFeatureUncheckedUpdateInput,
  ): Promise<PlanFeature> {
    return this.prisma.planFeature.update({ where: { id }, data });
  }

  deleteFeature(id: string): Promise<PlanFeature> {
    return this.prisma.planFeature.delete({ where: { id } });
  }

  // ─── Plan FAQs ────────────────────────────────────────────

  findAllFaqs(tenantId: string): Promise<PlanFaq[]> {
    return this.prisma.planFaq.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findPublishedFaqs(tenantId: string): Promise<PlanFaq[]> {
    return this.prisma.planFaq.findMany({
      where: { tenantId, isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findFaqById(tenantId: string, id: string): Promise<PlanFaq | null> {
    return this.prisma.planFaq.findFirst({ where: { id, tenantId } });
  }

  createFaq(
    tenantId: string,
    data: Omit<Prisma.PlanFaqUncheckedCreateInput, 'tenantId'>,
  ): Promise<PlanFaq> {
    return this.prisma.planFaq.create({ data: { ...data, tenantId } });
  }

  updateFaq(
    id: string,
    data: Prisma.PlanFaqUncheckedUpdateInput,
  ): Promise<PlanFaq> {
    return this.prisma.planFaq.update({ where: { id }, data });
  }

  deleteFaq(id: string): Promise<PlanFaq> {
    return this.prisma.planFaq.delete({ where: { id } });
  }
}
