import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, StaticPage } from '../../generated/prisma';

export interface StaticPageSummary {
  id: string;
  slug: string;
  title: string;
}

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublished(tenantId: string): Promise<StaticPageSummary[]> {
    return this.prisma.staticPage.findMany({
      where: { tenantId, isPublished: true },
      select: { id: true, slug: true, title: true },
      orderBy: { title: 'asc' },
    });
  }

  findPublishedBySlug(
    tenantId: string,
    slug: string,
  ): Promise<StaticPage | null> {
    return this.prisma.staticPage.findFirst({
      where: { tenantId, slug, isPublished: true },
    });
  }

  findAll(tenantId: string): Promise<StaticPage[]> {
    return this.prisma.staticPage.findMany({
      where: { tenantId },
      orderBy: { title: 'asc' },
    });
  }

  findById(tenantId: string, id: string): Promise<StaticPage | null> {
    return this.prisma.staticPage.findFirst({ where: { id, tenantId } });
  }

  findBySlug(tenantId: string, slug: string): Promise<StaticPage | null> {
    return this.prisma.staticPage.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.StaticPageUncheckedCreateInput, 'tenantId'>,
  ): Promise<StaticPage> {
    return this.prisma.staticPage.create({ data: { ...data, tenantId } });
  }

  update(
    id: string,
    data: Prisma.StaticPageUncheckedUpdateInput,
  ): Promise<StaticPage> {
    return this.prisma.staticPage.update({ where: { id }, data });
  }

  delete(id: string): Promise<StaticPage> {
    return this.prisma.staticPage.delete({ where: { id } });
  }
}
