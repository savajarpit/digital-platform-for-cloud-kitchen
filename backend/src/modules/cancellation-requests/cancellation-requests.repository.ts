import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CancellationRequestStatus,
  CustomerCancellationRequest,
  Prisma,
  Role,
} from '../../generated/prisma';

const LIST_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  subscription: {
    select: {
      id: true,
      planNameSnapshot: true,
      status: true,
      startDate: true,
      cycleEnd: true,
    },
  },
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalInPaise: true,
      deliveryDate: true,
      deliverySlotName: true,
      isInstant: true,
    },
  },
} satisfies Prisma.CustomerCancellationRequestInclude;

export type CancellationRequestWithDetails =
  Prisma.CustomerCancellationRequestGetPayload<{
    include: typeof LIST_INCLUDE;
  }>;

export interface CancellationListFilter {
  status?: CancellationRequestStatus;
  type?: 'SUBSCRIPTION' | 'ORDER';
}

@Injectable()
export class CancellationRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the request unless one is already pending for the same
   * subscription/order — checked and written under a transaction-scoped
   * advisory lock on that target, so two quick taps (or two tabs) can never
   * open two pending requests. Returns null when one was already pending.
   */
  createIfNonePending(
    data: Prisma.CustomerCancellationRequestUncheckedCreateInput,
  ): Promise<CustomerCancellationRequest | null> {
    const target = data.subscriptionId ?? data.orderId ?? '';
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cancel-request:${target}`}))`;
      const pending = await tx.customerCancellationRequest.findFirst({
        where: {
          status: CancellationRequestStatus.PENDING,
          ...(data.subscriptionId
            ? { subscriptionId: data.subscriptionId }
            : { orderId: data.orderId }),
        },
      });
      if (pending) return null;
      return tx.customerCancellationRequest.create({ data });
    });
  }

  findByIdForTenant(
    tenantId: string,
    id: string,
  ): Promise<CancellationRequestWithDetails | null> {
    return this.prisma.customerCancellationRequest.findFirst({
      where: { id, tenantId },
      include: LIST_INCLUDE,
    });
  }

  findLatestForOrder(
    tenantId: string,
    orderId: string,
  ): Promise<CustomerCancellationRequest | null> {
    return this.prisma.customerCancellationRequest.findFirst({
      where: { tenantId, orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPendingForTarget(
    tenantId: string,
    target: { subscriptionId?: string; orderId?: string },
  ): Promise<CancellationRequestWithDetails | null> {
    return this.prisma.customerCancellationRequest.findFirst({
      where: { tenantId, status: CancellationRequestStatus.PENDING, ...target },
      include: LIST_INCLUDE,
    });
  }

  findMany(
    tenantId: string,
    filter: CancellationListFilter,
    skip: number,
    take: number,
  ): Promise<[CancellationRequestWithDetails[], number]> {
    const where: Prisma.CustomerCancellationRequestWhereInput = {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.type === 'SUBSCRIPTION'
        ? { subscriptionId: { not: null } }
        : filter.type === 'ORDER'
          ? { orderId: { not: null } }
          : {}),
    };
    return this.prisma.$transaction([
      this.prisma.customerCancellationRequest.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customerCancellationRequest.count({ where }),
    ]);
  }

  async countPending(
    tenantId: string,
  ): Promise<{ subscriptions: number; orders: number }> {
    const [subscriptions, orders] = await Promise.all([
      this.prisma.customerCancellationRequest.count({
        where: {
          tenantId,
          status: CancellationRequestStatus.PENDING,
          subscriptionId: { not: null },
        },
      }),
      this.prisma.customerCancellationRequest.count({
        where: {
          tenantId,
          status: CancellationRequestStatus.PENDING,
          orderId: { not: null },
        },
      }),
    ]);
    return { subscriptions, orders };
  }

  /** Closes a request only if it's still pending — a reject racing a
   * withdraw (or an approve) settles exactly once. Returns false when it
   * was no longer pending. */
  async closeIfPending(
    id: string,
    data: {
      status: CancellationRequestStatus;
      resolvedByUserId?: string;
      resolutionNote?: string;
    },
  ): Promise<boolean> {
    const { count } = await this.prisma.customerCancellationRequest.updateMany({
      where: { id, status: CancellationRequestStatus.PENDING },
      data: { ...data, resolvedAt: new Date() },
    });
    return count === 1;
  }

  async setBankedDays(id: string, bankedDays: number): Promise<void> {
    await this.prisma.customerCancellationRequest.update({
      where: { id },
      data: { bankedDays },
    });
  }

  findOwnedSubscription(tenantId: string, userId: string, id: string) {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId, userId },
      select: {
        id: true,
        status: true,
        planNameSnapshot: true,
        startDate: true,
        cycleEnd: true,
      },
    });
  }

  findOwnedOrder(tenantId: string, userId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, tenantId, userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        subscriptionId: true,
        fulfillmentType: true,
        totalInPaise: true,
        deliveryDate: true,
        deliverySlotName: true,
        isInstant: true,
      },
    });
  }

  findCustomer(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
  }

  /** Everyone who should hear about a new request: the tenant's active
   * OWNER accounts plus the order-notification inbox, deduped. */
  async findOwnerRecipients(tenantId: string): Promise<string[]> {
    const [owners, settings] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          tenantId,
          role: Role.OWNER,
          isActive: true,
          deletedAt: null,
        },
        select: { email: true },
      }),
      this.prisma.notificationSettings.findUnique({
        where: { tenantId },
        select: { ownerNotificationEmail: true },
      }),
    ]);
    const emails = owners.map((o) => o.email.toLowerCase());
    if (settings?.ownerNotificationEmail) {
      emails.push(settings.ownerNotificationEmail.toLowerCase());
    }
    return [...new Set(emails)];
  }

  findTenantContext(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        slug: true,
        customDomain: true,
        businessProfile: { select: { timezone: true } },
        orderAcceptanceSettings: {
          select: { allowOrderCancelRequests: true },
        },
      },
    });
  }
}
