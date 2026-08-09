import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, Review } from '../../generated/prisma';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenant(tenantId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findPublished(tenantId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { tenantId, isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(tenantId: string, id: string): Promise<Review | null> {
    return this.prisma.review.findFirst({ where: { id, tenantId } });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.ReviewUncheckedCreateInput, 'tenantId'>,
  ): Promise<Review> {
    return this.prisma.review.create({ data: { ...data, tenantId } });
  }

  update(id: string, data: Prisma.ReviewUncheckedUpdateInput): Promise<Review> {
    return this.prisma.review.update({ where: { id }, data });
  }

  delete(id: string): Promise<Review> {
    return this.prisma.review.delete({ where: { id } });
  }
}
