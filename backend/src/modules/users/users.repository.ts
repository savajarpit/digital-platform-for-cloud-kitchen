import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { User, Prisma, Role } from '../../generated/prisma';

export type CustomerWithOrderCount = User & { _count: { orders: number } };

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

  countCustomers(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId, role: Role.CUSTOMER, deletedAt: null },
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

  /** Order counts exclude PENDING_PAYMENT — abandoned checkouts shouldn't
   * inflate a customer's "orders placed" count, same principle as filtering
   * them from the customer's own order list. */
  async findCustomers(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ): Promise<[CustomerWithOrderCount[], number]> {
    const where: Prisma.UserWhereInput = {
      tenantId,
      role: Role.CUSTOMER,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              orders: { where: { status: { not: 'PENDING_PAYMENT' } } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  /** Admin customer detail — profile + addresses + recent paid orders +
   * subscriptions, one query. Orders exclude PENDING_PAYMENT for the same
   * "abandoned checkout" reason as everywhere else this filter appears. */
  findCustomerDetail(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId, role: Role.CUSTOMER, deletedAt: null },
      include: {
        addresses: { orderBy: { createdAt: 'desc' } },
        orders: {
          where: { status: { not: 'PENDING_PAYMENT' } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: true },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { name: true } } },
        },
      },
    });
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
