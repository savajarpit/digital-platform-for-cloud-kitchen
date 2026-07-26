import { Injectable, NotFoundException } from '@nestjs/common';
import { FeaturesRepository } from './features.repository';
import { Role } from '../../generated/prisma';
import { FEATURE_CATALOG } from '../../common/enums/feature.enum';

export interface MyFeatures {
  features: string[];
}

export interface FeatureGrantView {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

@Injectable()
export class FeaturesService {
  constructor(private readonly featuresRepo: FeaturesRepository) {}

  async getMyFeatures(
    role: Role,
    tenantId: string | undefined,
  ): Promise<MyFeatures> {
    if (role === Role.SUPER_ADMIN) {
      return { features: FEATURE_CATALOG.map((f) => f.key) };
    }
    if (!tenantId) return { features: [] };

    const rows = await this.featuresRepo.findEnabledForTenant(tenantId);
    return { features: rows.map((row) => row.feature.key) };
  }

  async hasFeature(tenantId: string, key: string): Promise<boolean> {
    const rows = await this.featuresRepo.findEnabledForTenant(tenantId);
    return rows.some((row) => row.feature.key === key);
  }

  /** Full catalog for this tenant, each entry marked enabled or not — backs the platform module's feature grid. */
  async getTenantFeatureView(tenantId: string): Promise<FeatureGrantView[]> {
    const [catalog, grants] = await Promise.all([
      this.featuresRepo.findAllFeatures(),
      this.featuresRepo.findAllForTenant(tenantId),
    ]);
    const enabledByKey = new Map(grants.map((g) => [g.feature.key, g.enabled]));
    return catalog.map((feature) => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      enabled: enabledByKey.get(feature.key) ?? false,
    }));
  }

  async setFeature(
    tenantId: string,
    featureKey: string,
    enabled: boolean,
    userId: string,
  ): Promise<FeatureGrantView> {
    const feature = await this.featuresRepo.findFeatureByKey(featureKey);
    if (!feature) throw new NotFoundException('Unknown feature key');

    await this.featuresRepo.upsertGrant(tenantId, feature.id, enabled, userId);

    return {
      key: feature.key,
      name: feature.name,
      description: feature.description,
      enabled,
    };
  }
}
