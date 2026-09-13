import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AddonGroupsRepository,
  AddonGroupWithItems,
} from './addon-groups.repository';
import { CreateAddonGroupDto } from './dto/create-addon-group.dto';
import { UpdateAddonGroupDto } from './dto/update-addon-group.dto';
import { CreateAddonItemDto } from './dto/create-addon-item.dto';
import { UpdateAddonItemDto } from './dto/update-addon-item.dto';
import { AddonGroup, AddonItem } from '../../generated/prisma';

@Injectable()
export class AddonGroupsService {
  constructor(private readonly addonsRepo: AddonGroupsRepository) {}

  createGroup(tenantId: string, dto: CreateAddonGroupDto): Promise<AddonGroup> {
    if (dto.minSelections !== undefined && dto.maxSelections !== undefined) {
      this.assertSelectionBoundsValid(dto.minSelections, dto.maxSelections);
    }
    return this.addonsRepo.createGroup(tenantId, dto);
  }

  findAllForTenant(tenantId: string): Promise<AddonGroupWithItems[]> {
    return this.addonsRepo.findGroupsForTenant(tenantId);
  }

  async updateGroup(
    tenantId: string,
    id: string,
    dto: UpdateAddonGroupDto,
  ): Promise<AddonGroup> {
    const group = await this.addonsRepo.findGroupById(tenantId, id);
    if (!group) throw new NotFoundException('Add-on group not found');

    const minSelections = dto.minSelections ?? group.minSelections;
    const maxSelections = dto.maxSelections ?? group.maxSelections;
    this.assertSelectionBoundsValid(minSelections, maxSelections);

    return this.addonsRepo.updateGroup(id, dto);
  }

  async deleteGroup(tenantId: string, id: string): Promise<void> {
    const group = await this.addonsRepo.findGroupById(tenantId, id);
    if (!group) throw new NotFoundException('Add-on group not found');
    await this.addonsRepo.deleteGroupCascade(id);
  }

  async createItem(
    tenantId: string,
    dto: CreateAddonItemDto,
  ): Promise<AddonItem> {
    const group = await this.addonsRepo.findGroupById(
      tenantId,
      dto.addonGroupId,
    );
    if (!group) throw new NotFoundException('Add-on group not found');
    return this.addonsRepo.createItem(tenantId, dto);
  }

  async updateItem(
    tenantId: string,
    id: string,
    dto: UpdateAddonItemDto,
  ): Promise<AddonItem> {
    const item = await this.addonsRepo.findItemById(tenantId, id);
    if (!item) throw new NotFoundException('Add-on item not found');
    return this.addonsRepo.updateItem(id, dto);
  }

  async deleteItem(tenantId: string, id: string): Promise<void> {
    const item = await this.addonsRepo.findItemById(tenantId, id);
    if (!item) throw new NotFoundException('Add-on item not found');
    await this.addonsRepo.deleteItem(id);
  }

  /** Used by MealsService.findAll/findOne (storefront) — only ever called
   * once the caller has already confirmed the tenant has the menu-addons
   * feature; this method itself has no feature awareness. */
  findAttachedGroupsForMeals(
    tenantId: string,
    mealIds: string[],
  ): Promise<Map<string, AddonGroupWithItems[]>> {
    return this.addonsRepo.findAttachedGroupsForMeals(tenantId, mealIds);
  }

  async setMealAddonGroups(
    tenantId: string,
    mealId: string,
    addonGroupIds: string[],
  ): Promise<void> {
    if (addonGroupIds.length > 0) {
      const matched = await this.addonsRepo.countGroupsMatching(
        tenantId,
        addonGroupIds,
      );
      if (matched !== addonGroupIds.length) {
        throw new BadRequestException(
          'One or more add-on groups were not found',
        );
      }
    }
    await this.addonsRepo.setMealAddonGroups(mealId, addonGroupIds);
  }

  private assertSelectionBoundsValid(min: number, max: number): void {
    if (min > max) {
      throw new BadRequestException(
        'Minimum selections cannot be greater than maximum selections.',
      );
    }
  }
}
