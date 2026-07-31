import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentRepository, StaticPageSummary } from './content.repository';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { StaticPage } from '../../generated/prisma';

@Injectable()
export class ContentService {
  constructor(private readonly contentRepo: ContentRepository) {}

  findPublished(tenantId: string): Promise<StaticPageSummary[]> {
    return this.contentRepo.findPublished(tenantId);
  }

  async findPublishedBySlug(
    tenantId: string,
    slug: string,
  ): Promise<StaticPage> {
    const page = await this.contentRepo.findPublishedBySlug(tenantId, slug);
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  /** Used by AuthService to gate signup on a tenant having published its consent pages. */
  async hasPublished(tenantId: string, slug: string): Promise<boolean> {
    const page = await this.contentRepo.findPublishedBySlug(tenantId, slug);
    return Boolean(page);
  }

  findAll(tenantId: string): Promise<StaticPage[]> {
    return this.contentRepo.findAll(tenantId);
  }

  async create(
    tenantId: string,
    dto: CreateStaticPageDto,
  ): Promise<StaticPage> {
    await this.assertSlugAvailable(tenantId, dto.slug);
    return this.contentRepo.create(tenantId, dto);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateStaticPageDto,
  ): Promise<StaticPage> {
    const page = await this.contentRepo.findById(tenantId, id);
    if (!page) throw new NotFoundException('Page not found');

    if (dto.slug && dto.slug !== page.slug) {
      await this.assertSlugAvailable(tenantId, dto.slug);
    }

    return this.contentRepo.update(id, dto);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const page = await this.contentRepo.findById(tenantId, id);
    if (!page) throw new NotFoundException('Page not found');
    await this.contentRepo.delete(id);
  }

  private async assertSlugAvailable(
    tenantId: string,
    slug: string,
  ): Promise<void> {
    const existing = await this.contentRepo.findBySlug(tenantId, slug);
    if (existing) {
      throw new ConflictException('A page with this slug already exists');
    }
  }
}
