import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { User, Prisma } from '../../generated/prisma';
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `tenantId` is optional because a few internal auth flows (OTP verify,
   * token refresh) look a user up by id *before* any tenant context is
   * established — that id itself already comes from a trusted source there
   * (a signed JWT or a freshly-issued OTP session), not arbitrary client
   * input. Every cross-tenant-risk caller (the admin `:id` routes, the
   * self-service `me` routes) must always pass it.
   */
  async findById(id: string, tenantId?: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}), deletedAt: null },
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

  async updateProfile(
    id: string,
    data: Pick<Prisma.UserUpdateInput, 'firstName' | 'lastName' | 'phone'>,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
