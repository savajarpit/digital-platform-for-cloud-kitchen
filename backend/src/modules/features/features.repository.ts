import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Feature, TenantFeature } from '../../generated/prisma';

export type TenantFeatureWithKey = TenantFeature & { feature: Feature };

@Injectable()
export class FeaturesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllFeatures(): Promise<Feature[]> {
    return this.prisma.feature.findMany({ orderBy: { name: 'asc' } });
  }

  findEnabledForTenant(tenantId: string): Promise<TenantFeatureWithKey[]> {
    return this.prisma.tenantFeature.findMany({
      where: { tenantId, enabled: true },
      include: { feature: true },
    });
  }

  findAllForTenant(tenantId: string): Promise<TenantFeatureWithKey[]> {
    return this.prisma.tenantFeature.findMany({
      where: { tenantId },
      include: { feature: true },
    });
  }

  findFeatureByKey(key: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { key } });
  }

  upsertGrant(
    tenantId: string,
    featureId: string,
    enabled: boolean,
    enabledByUserId: string,
  ): Promise<TenantFeature> {
    return this.prisma.tenantFeature.upsert({
      where: { tenantId_featureId: { tenantId, featureId } },
      update: {
        enabled,
        enabledAt: enabled ? new Date() : null,
        enabledByUserId,
      },
      create: {
        tenantId,
        featureId,
        enabled,
        enabledAt: enabled ? new Date() : null,
        enabledByUserId,
      },
    });
  }
}
