import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '../../generated/prisma';

@Injectable()
export class CategoriesService {
  constructor(private readonly menuRepo: MenuRepository) {}

  findAll(tenantId: string, onlyActive: boolean): Promise<Category[]> {
    return this.menuRepo.findCategories(tenantId, onlyActive);
  }

  async create(tenantId: string, dto: CreateCategoryDto): Promise<Category> {
    await this.assertSlugAvailable(tenantId, dto.slug);
    return this.menuRepo.createCategory(tenantId, dto);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.menuRepo.findCategoryById(tenantId, id);
    if (!category) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== category.slug) {
      await this.assertSlugAvailable(tenantId, dto.slug);
    }

    return this.menuRepo.updateCategory(id, dto);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const category = await this.menuRepo.findCategoryById(tenantId, id);
    if (!category) throw new NotFoundException('Category not found');
    await this.menuRepo.deleteCategory(id);
  }

  private async assertSlugAvailable(
    tenantId: string,
    slug: string,
  ): Promise<void> {
    const existing = await this.menuRepo.findCategoryBySlug(tenantId, slug);
    if (existing) {
      throw new ConflictException('A category with this slug already exists');
    }
  }
}
