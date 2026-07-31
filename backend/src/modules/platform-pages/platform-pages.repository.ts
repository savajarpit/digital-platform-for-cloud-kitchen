import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, PlatformPage } from '../../generated/prisma';

export interface PlatformPageSummary {
  id: string;
  slug: string;
  title: string;
}

@Injectable()
export class PlatformPagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublished(): Promise<PlatformPageSummary[]> {
    return this.prisma.platformPage.findMany({
      where: { isPublished: true },
      select: { id: true, slug: true, title: true },
      orderBy: { title: 'asc' },
    });
  }

  findPublishedBySlug(slug: string): Promise<PlatformPage | null> {
    return this.prisma.platformPage.findFirst({
      where: { slug, isPublished: true },
    });
  }

  findAll(): Promise<PlatformPage[]> {
    return this.prisma.platformPage.findMany({ orderBy: { title: 'asc' } });
  }

  findById(id: string): Promise<PlatformPage | null> {
    return this.prisma.platformPage.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<PlatformPage | null> {
    return this.prisma.platformPage.findUnique({ where: { slug } });
  }

  create(data: Prisma.PlatformPageCreateInput): Promise<PlatformPage> {
    return this.prisma.platformPage.create({ data });
  }

  update(
    id: string,
    data: Prisma.PlatformPageUpdateInput,
  ): Promise<PlatformPage> {
    return this.prisma.platformPage.update({ where: { id }, data });
  }

  delete(id: string): Promise<PlatformPage> {
    return this.prisma.platformPage.delete({ where: { id } });
  }
}
