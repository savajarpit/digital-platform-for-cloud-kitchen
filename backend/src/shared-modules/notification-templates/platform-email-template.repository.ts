import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformEmailTemplate } from '../../generated/prisma';

@Injectable()
export class PlatformEmailTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformEmailTemplate[]> {
    return this.prisma.platformEmailTemplate.findMany({
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
  }

  findByKey(key: string): Promise<PlatformEmailTemplate | null> {
    return this.prisma.platformEmailTemplate.findUnique({ where: { key } });
  }

  update(
    key: string,
    data: { subject: string; bodyHtml: string; updatedByUserId: string },
  ): Promise<PlatformEmailTemplate> {
    return this.prisma.platformEmailTemplate.update({ where: { key }, data });
  }

  /** Seed sync — mirrors FeaturesRepository/PermissionsRepository's
   * catalog-sync convention. Only creates missing rows; never overwrites an
   * already-edited row's subject/bodyHtml (that would silently discard a
   * real SUPER_ADMIN edit on every restart). */
  async upsertDefault(row: {
    key: string;
    name: string;
    description: string;
    scope: PlatformEmailTemplate['scope'];
    subject: string;
    bodyHtml: string;
    availableVars: string[];
  }): Promise<void> {
    const existing = await this.prisma.platformEmailTemplate.findUnique({
      where: { key: row.key },
    });
    if (existing) {
      // Keep name/description/scope/availableVars in sync with the code
      // (these are catalog metadata, not editable content) without
      // touching the SUPER_ADMIN-editable subject/bodyHtml.
      await this.prisma.platformEmailTemplate.update({
        where: { key: row.key },
        data: {
          name: row.name,
          description: row.description,
          scope: row.scope,
          availableVars: row.availableVars,
        },
      });
      return;
    }
    await this.prisma.platformEmailTemplate.create({ data: row });
  }
}
