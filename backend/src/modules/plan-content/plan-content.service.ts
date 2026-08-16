import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanContentRepository } from './plan-content.repository';
import { UpsertPlanFeatureDto } from './dto/upsert-plan-feature.dto';
import { UpsertPlanFaqDto } from './dto/upsert-plan-faq.dto';

@Injectable()
export class PlanContentService {
  constructor(private readonly repo: PlanContentRepository) {}

  // ─── Plan features ────────────────────────────────────────

  findAllFeaturesForAdmin(tenantId: string) {
    return this.repo.findAllFeatures(tenantId);
  }

  findEnabledFeatures(tenantId: string) {
    return this.repo.findEnabledFeatures(tenantId);
  }

  createFeature(tenantId: string, dto: UpsertPlanFeatureDto) {
    return this.repo.createFeature(tenantId, dto);
  }

  async updateFeature(
    tenantId: string,
    id: string,
    dto: Partial<UpsertPlanFeatureDto>,
  ) {
    const feature = await this.repo.findFeatureById(tenantId, id);
    if (!feature) throw new NotFoundException('Plan feature not found');
    return this.repo.updateFeature(id, dto);
  }

  async deleteFeature(tenantId: string, id: string): Promise<void> {
    const feature = await this.repo.findFeatureById(tenantId, id);
    if (!feature) throw new NotFoundException('Plan feature not found');
    await this.repo.deleteFeature(id);
  }

  // ─── Plan FAQs ────────────────────────────────────────────

  findAllFaqsForAdmin(tenantId: string) {
    return this.repo.findAllFaqs(tenantId);
  }

  findPublishedFaqs(tenantId: string) {
    return this.repo.findPublishedFaqs(tenantId);
  }

  createFaq(tenantId: string, dto: UpsertPlanFaqDto) {
    return this.repo.createFaq(tenantId, dto);
  }

  async updateFaq(tenantId: string, id: string, dto: Partial<UpsertPlanFaqDto>) {
    const faq = await this.repo.findFaqById(tenantId, id);
    if (!faq) throw new NotFoundException('Plan FAQ not found');
    return this.repo.updateFaq(id, dto);
  }

  async deleteFaq(tenantId: string, id: string): Promise<void> {
    const faq = await this.repo.findFaqById(tenantId, id);
    if (!faq) throw new NotFoundException('Plan FAQ not found');
    await this.repo.deleteFaq(id);
  }
}
