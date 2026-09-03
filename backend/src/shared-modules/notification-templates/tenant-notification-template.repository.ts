import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { TenantNotificationTemplate } from '../../generated/prisma';

@Injectable()
export class TenantNotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenantAndKey(
    tenantId: string,
    key: string,
  ): Promise<TenantNotificationTemplate | null> {
    return this.prisma.tenantNotificationTemplate.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
  }

  findAllForTenant(tenantId: string): Promise<TenantNotificationTemplate[]> {
    return this.prisma.tenantNotificationTemplate.findMany({
      where: { tenantId },
    });
  }

  upsert(
    tenantId: string,
    key: string,
    data: { subject: string; bodyHtml: string; updatedByUserId: string },
  ): Promise<TenantNotificationTemplate> {
    return this.prisma.tenantNotificationTemplate.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: data,
      create: { tenantId, key, ...data },
    });
  }

  async delete(tenantId: string, key: string): Promise<void> {
    await this.prisma.tenantNotificationTemplate.deleteMany({
      where: { tenantId, key },
    });
  }
}
