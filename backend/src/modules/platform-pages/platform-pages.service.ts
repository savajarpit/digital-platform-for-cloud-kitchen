import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlatformPagesRepository,
  PlatformPageSummary,
} from './platform-pages.repository';
import { CreatePlatformPageDto } from './dto/create-platform-page.dto';
import { UpdatePlatformPageDto } from './dto/update-platform-page.dto';
import { PlatformPage } from '../../generated/prisma';

@Injectable()
export class PlatformPagesService {
  constructor(private readonly platformPagesRepo: PlatformPagesRepository) {}

  findPublished(): Promise<PlatformPageSummary[]> {
    return this.platformPagesRepo.findPublished();
  }

  async findPublishedBySlug(slug: string): Promise<PlatformPage> {
    const page = await this.platformPagesRepo.findPublishedBySlug(slug);
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  findAll(): Promise<PlatformPage[]> {
    return this.platformPagesRepo.findAll();
  }

  async create(dto: CreatePlatformPageDto): Promise<PlatformPage> {
    await this.assertSlugAvailable(dto.slug);
    return this.platformPagesRepo.create(dto);
  }

  async update(id: string, dto: UpdatePlatformPageDto): Promise<PlatformPage> {
    const page = await this.platformPagesRepo.findById(id);
    if (!page) throw new NotFoundException('Page not found');

    if (dto.slug && dto.slug !== page.slug) {
      await this.assertSlugAvailable(dto.slug);
    }

    return this.platformPagesRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const page = await this.platformPagesRepo.findById(id);
    if (!page) throw new NotFoundException('Page not found');
    await this.platformPagesRepo.delete(id);
  }

  private async assertSlugAvailable(slug: string): Promise<void> {
    const existing = await this.platformPagesRepo.findBySlug(slug);
    if (existing) {
      throw new ConflictException('A page with this slug already exists');
    }
  }
}
