import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async findAll(
    tenantId: string,
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { tenantId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
