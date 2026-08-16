import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, SocialLink } from '../../generated/prisma';

@Injectable()
export class SocialLinksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenant(tenantId: string): Promise<SocialLink[]> {
    return this.prisma.socialLink.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findEnabled(tenantId: string): Promise<SocialLink[]> {
    return this.prisma.socialLink.findMany({
      where: { tenantId, isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(tenantId: string, id: string): Promise<SocialLink | null> {
    return this.prisma.socialLink.findFirst({ where: { id, tenantId } });
  }

  findByPlatform(
    tenantId: string,
    platform: SocialLink['platform'],
  ): Promise<SocialLink | null> {
    return this.prisma.socialLink.findUnique({
      where: { tenantId_platform: { tenantId, platform } },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.SocialLinkUncheckedCreateInput, 'tenantId'>,
  ): Promise<SocialLink> {
    return this.prisma.socialLink.create({ data: { ...data, tenantId } });
  }

  update(
    id: string,
    data: Prisma.SocialLinkUncheckedUpdateInput,
  ): Promise<SocialLink> {
    return this.prisma.socialLink.update({ where: { id }, data });
  }

  delete(id: string): Promise<SocialLink> {
    return this.prisma.socialLink.delete({ where: { id } });
  }
}
