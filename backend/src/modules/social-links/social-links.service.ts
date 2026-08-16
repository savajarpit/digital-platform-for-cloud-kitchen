import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialLinksRepository } from './social-links.repository';
import {
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
} from './dto/upsert-social-link.dto';

@Injectable()
export class SocialLinksService {
  constructor(private readonly repo: SocialLinksRepository) {}

  findAllForAdmin(tenantId: string) {
    return this.repo.findAllByTenant(tenantId);
  }

  findPublished(tenantId: string) {
    return this.repo.findEnabled(tenantId);
  }

  async create(tenantId: string, dto: CreateSocialLinkDto) {
    const existing = await this.repo.findByPlatform(tenantId, dto.platform);
    if (existing) {
      throw new ConflictException(
        `A link for ${dto.platform} already exists — edit or delete it instead.`,
      );
    }
    return this.repo.create(tenantId, dto);
  }

  async update(tenantId: string, id: string, dto: UpdateSocialLinkDto) {
    const link = await this.repo.findById(tenantId, id);
    if (!link) throw new NotFoundException('Social link not found');
    return this.repo.update(id, dto);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const link = await this.repo.findById(tenantId, id);
    if (!link) throw new NotFoundException('Social link not found');
    await this.repo.delete(id);
  }
}
