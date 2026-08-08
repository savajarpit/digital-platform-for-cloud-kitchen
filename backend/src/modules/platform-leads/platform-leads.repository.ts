import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PlatformLead,
  PlatformLeadStatus,
  Prisma,
} from '../../generated/prisma';

const LEAD_INCLUDE = {
  plan: { select: { name: true } },
} satisfies Prisma.PlatformLeadInclude;

export type PlatformLeadWithPlan = Prisma.PlatformLeadGetPayload<{
  include: typeof LEAD_INCLUDE;
}>;

@Injectable()
export class PlatformLeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.PlatformLeadUncheckedCreateInput,
  ): Promise<PlatformLeadWithPlan> {
    return this.prisma.platformLead.create({ data, include: LEAD_INCLUDE });
  }

  findAll() {
    return this.prisma.platformLead.findMany({
      orderBy: { createdAt: 'desc' },
      include: LEAD_INCLUDE,
    });
  }

  findById(id: string): Promise<PlatformLead | null> {
    return this.prisma.platformLead.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: PlatformLeadStatus): Promise<PlatformLead> {
    return this.prisma.platformLead.update({ where: { id }, data: { status } });
  }
}
