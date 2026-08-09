import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HomeSectionsRepository } from './home-sections.repository';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import { SetHomeSectionItemsDto } from './dto/set-home-section-items.dto';

@Injectable()
export class HomeSectionsService {
  constructor(private readonly repo: HomeSectionsRepository) {}

  findAllForAdmin(tenantId: string) {
    return this.repo.findAllByTenant(tenantId);
  }

  findPublic(tenantId: string) {
    return this.repo.findEnabledWithItems(tenantId);
  }

  create(tenantId: string, dto: UpsertHomeSectionDto) {
    return this.repo.create(tenantId, dto);
  }

  async update(tenantId: string, id: string, dto: UpsertHomeSectionDto) {
    const section = await this.repo.findById(tenantId, id);
    if (!section) throw new NotFoundException('Home section not found');
    return this.repo.update(id, dto);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const section = await this.repo.findById(tenantId, id);
    if (!section) throw new NotFoundException('Home section not found');
    await this.repo.delete(id);
  }

  async setItems(tenantId: string, id: string, dto: SetHomeSectionItemsDto) {
    const section = await this.repo.findById(tenantId, id);
    if (!section) throw new NotFoundException('Home section not found');

    if (dto.mealIds.length > 0) {
      const owned = await this.repo.findMealsByIds(tenantId, dto.mealIds);
      if (owned.length !== new Set(dto.mealIds).size) {
        throw new BadRequestException('One or more meals were not found');
      }
    }

    await this.repo.replaceItems(id, dto.mealIds);
    return this.repo
      .findAllByTenant(tenantId)
      .then((sections) => sections.find((s) => s.id === id));
  }
}
