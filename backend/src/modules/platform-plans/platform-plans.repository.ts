import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformPlan, Prisma } from '../../generated/prisma';

@Injectable()
export class PlatformPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformPlan[]> {
    return this.prisma.platformPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  findPublished(): Promise<PlatformPlan[]> {
    return this.prisma.platformPlan.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(id: string): Promise<PlatformPlan | null> {
    return this.prisma.platformPlan.findUnique({ where: { id } });
  }

  create(data: Prisma.PlatformPlanUncheckedCreateInput): Promise<PlatformPlan> {
    return this.prisma.platformPlan.create({ data });
  }

  update(
    id: string,
    data: Prisma.PlatformPlanUncheckedUpdateInput,
  ): Promise<PlatformPlan> {
    return this.prisma.platformPlan.update({ where: { id }, data });
  }

  delete(id: string): Promise<PlatformPlan> {
    return this.prisma.platformPlan.delete({ where: { id } });
  }
}
