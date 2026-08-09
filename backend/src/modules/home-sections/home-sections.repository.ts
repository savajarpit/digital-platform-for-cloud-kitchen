import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { HomeSection, Prisma } from '../../generated/prisma';

const ITEM_INCLUDE = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: { meal: { include: { category: true } } },
  },
};

export type HomeSectionWithItems = Prisma.HomeSectionGetPayload<{
  include: typeof ITEM_INCLUDE;
}>;

@Injectable()
export class HomeSectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenant(tenantId: string): Promise<HomeSectionWithItems[]> {
    return this.prisma.homeSection.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: ITEM_INCLUDE,
    });
  }

  async findEnabledWithItems(
    tenantId: string,
  ): Promise<HomeSectionWithItems[]> {
    const sections = await this.prisma.homeSection.findMany({
      where: { tenantId, isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          where: { meal: { isAvailable: true, deletedAt: null } },
          include: { meal: { include: { category: true } } },
        },
      },
    });
    // A section with every item currently unavailable would render empty —
    // hide it rather than showing a title with nothing under it.
    return sections.filter((section) => section.items.length > 0);
  }

  findById(tenantId: string, id: string): Promise<HomeSection | null> {
    return this.prisma.homeSection.findFirst({ where: { id, tenantId } });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.HomeSectionUncheckedCreateInput, 'tenantId'>,
  ): Promise<HomeSection> {
    return this.prisma.homeSection.create({ data: { ...data, tenantId } });
  }

  update(
    id: string,
    data: Prisma.HomeSectionUncheckedUpdateInput,
  ): Promise<HomeSection> {
    return this.prisma.homeSection.update({ where: { id }, data });
  }

  delete(id: string): Promise<HomeSection> {
    return this.prisma.homeSection.delete({ where: { id } });
  }

  async replaceItems(sectionId: string, mealIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.homeSectionItem.deleteMany({ where: { sectionId } }),
      this.prisma.homeSectionItem.createMany({
        data: mealIds.map((mealId, index) => ({
          sectionId,
          mealId,
          sortOrder: index,
        })),
      }),
    ]);
  }

  findMealsByIds(tenantId: string, ids: string[]) {
    return this.prisma.meal.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: { id: true },
    });
  }
}
