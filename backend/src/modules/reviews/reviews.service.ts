import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { UpsertReviewDto } from './dto/upsert-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly repo: ReviewsRepository) {}

  findAllForAdmin(tenantId: string) {
    return this.repo.findAllByTenant(tenantId);
  }

  findPublished(tenantId: string) {
    return this.repo.findPublished(tenantId);
  }

  create(tenantId: string, dto: UpsertReviewDto) {
    return this.repo.create(tenantId, dto);
  }

  async update(tenantId: string, id: string, dto: Partial<UpsertReviewDto>) {
    const review = await this.repo.findById(tenantId, id);
    if (!review) throw new NotFoundException('Review not found');
    return this.repo.update(id, dto);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const review = await this.repo.findById(tenantId, id);
    if (!review) throw new NotFoundException('Review not found');
    await this.repo.delete(id);
  }
}
