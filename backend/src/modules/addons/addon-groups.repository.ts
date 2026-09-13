import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AddonGroup, AddonItem, Prisma } from '../../generated/prisma';

const GROUP_WITH_ITEMS_INCLUDE = {
  items: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] as const },
} satisfies Prisma.AddonGroupInclude;

export type AddonGroupWithItems = Prisma.AddonGroupGetPayload<{
  include: typeof GROUP_WITH_ITEMS_INCLUDE;
}>;

@Injectable()
export class AddonGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createGroup(
    tenantId: string,
    data: { name: string; minSelections?: number; maxSelections?: number },
  ): Promise<AddonGroup> {
    return this.prisma.addonGroup.create({
      data: {
        tenantId,
        name: data.name,
        minSelections: data.minSelections ?? 0,
        maxSelections: data.maxSelections ?? 1,
      },
    });
  }

  findGroupsForTenant(tenantId: string): Promise<AddonGroupWithItems[]> {
    return this.prisma.addonGroup.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: GROUP_WITH_ITEMS_INCLUDE,
    });
  }

  findGroupById(
    tenantId: string,
    id: string,
  ): Promise<AddonGroupWithItems | null> {
    return this.prisma.addonGroup.findFirst({
      where: { id, tenantId },
      include: GROUP_WITH_ITEMS_INCLUDE,
    });
  }

  updateGroup(
    id: string,
    data: Partial<{
      name: string;
      minSelections: number;
      maxSelections: number;
      isActive: boolean;
    }>,
  ): Promise<AddonGroup> {
    return this.prisma.addonGroup.update({ where: { id }, data });
  }

  /** Detaches the group from every meal, deletes its items, then the group
   * itself — a single transaction so a group is never left half-deleted. */
  async deleteGroupCascade(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mealAddonGroup.deleteMany({ where: { addonGroupId: id } }),
      this.prisma.addonItem.deleteMany({ where: { addonGroupId: id } }),
      this.prisma.addonGroup.delete({ where: { id } }),
    ]);
  }

  createItem(
    tenantId: string,
    data: {
      addonGroupId: string;
      name: string;
      priceInPaise: number;
      maxQuantityPerOrder?: number;
      isAvailable?: boolean;
    },
  ): Promise<AddonItem> {
    return this.prisma.addonItem.create({
      data: {
        tenantId,
        addonGroupId: data.addonGroupId,
        name: data.name,
        priceInPaise: data.priceInPaise,
        maxQuantityPerOrder: data.maxQuantityPerOrder ?? 1,
        isAvailable: data.isAvailable ?? true,
      },
    });
  }

  findItemById(tenantId: string, id: string): Promise<AddonItem | null> {
    return this.prisma.addonItem.findFirst({ where: { id, tenantId } });
  }

  updateItem(
    id: string,
    data: Partial<{
      name: string;
      priceInPaise: number;
      maxQuantityPerOrder: number;
      isAvailable: boolean;
    }>,
  ): Promise<AddonItem> {
    return this.prisma.addonItem.update({ where: { id }, data });
  }

  deleteItem(id: string): Promise<AddonItem> {
    return this.prisma.addonItem.delete({ where: { id } });
  }

  /** One query for a meal list (storefront/admin) instead
   * of N, keyed by mealId. */
  async findAttachedGroupsForMeals(
    tenantId: string,
    mealIds: string[],
  ): Promise<Map<string, AddonGroupWithItems[]>> {
    if (mealIds.length === 0) return new Map();
    const links = await this.prisma.mealAddonGroup.findMany({
      where: { mealId: { in: mealIds }, group: { tenantId, isActive: true } },
      include: { group: { include: GROUP_WITH_ITEMS_INCLUDE } },
      orderBy: { sortOrder: 'asc' },
    });
    const byMeal = new Map<string, AddonGroupWithItems[]>();
    for (const link of links) {
      const list = byMeal.get(link.mealId) ?? [];
      list.push(link.group);
      byMeal.set(link.mealId, list);
    }
    return byMeal;
  }

  async setMealAddonGroups(
    mealId: string,
    addonGroupIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mealAddonGroup.deleteMany({ where: { mealId } }),
      this.prisma.mealAddonGroup.createMany({
        data: addonGroupIds.map((addonGroupId, i) => ({
          mealId,
          addonGroupId,
          sortOrder: i,
        })),
      }),
    ]);
  }

  countGroupsMatching(tenantId: string, ids: string[]): Promise<number> {
    return this.prisma.addonGroup.count({
      where: { id: { in: ids }, tenantId },
    });
  }
}
