import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformWhatsAppTemplate, Prisma } from '../../generated/prisma';

@Injectable()
export class PlatformWhatsAppTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformWhatsAppTemplate[]> {
    return this.prisma.platformWhatsAppTemplate.findMany({
      orderBy: { key: 'asc' },
    });
  }

  findByKey(key: string): Promise<PlatformWhatsAppTemplate | null> {
    return this.prisma.platformWhatsAppTemplate.findUnique({
      where: { key },
    });
  }

  update(
    key: string,
    data: { templateKey: string; placeholders: Prisma.InputJsonValue },
  ): Promise<PlatformWhatsAppTemplate> {
    return this.prisma.platformWhatsAppTemplate.update({
      where: { key },
      data,
    });
  }

  async upsertDefault(row: {
    key: string;
    templateKey: string;
    placeholders: Prisma.InputJsonValue;
  }): Promise<void> {
    const existing = await this.prisma.platformWhatsAppTemplate.findUnique({
      where: { key: row.key },
    });
    if (existing) return; // don't clobber a SUPER_ADMIN edit on restart
    await this.prisma.platformWhatsAppTemplate.create({ data: row });
  }
}
