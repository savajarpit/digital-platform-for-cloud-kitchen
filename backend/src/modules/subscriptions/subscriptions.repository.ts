import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionSkip,
  SubscriptionStatus,
} from '../../generated/prisma';

export interface PlanDayInput {
  dayNumber: number;
  slots: { slotType: 'BREAKFAST' | 'LUNCH' | 'DINNER'; mealId?: string }[];
}

const PLAN_WITH_DAYS_INCLUDE = {
  days: {
    orderBy: { dayNumber: 'asc' as const },
    include: {
      slots: {
        include: {
          meal: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              priceInPaise: true,
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Admin plan CRUD ─────────────────────────────────────

  findPlansForTenant(
    tenantId: string,
    skip: number,
    take: number,
  ): Promise<[SubscriptionPlan[], number]> {
    return this.prisma.$transaction([
      this.prisma.subscriptionPlan.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscriptionPlan.count({ where: { tenantId } }),
    ]);
  }

  findPlanByIdAdmin(tenantId: string, id: string) {
    return this.prisma.subscriptionPlan.findFirst({
      where: { id, tenantId },
      include: PLAN_WITH_DAYS_INCLUDE,
    });
  }

  createPlan(
    tenantId: string,
    data: Omit<Prisma.SubscriptionPlanUncheckedCreateInput, 'tenantId'>,
  ): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.create({ data: { ...data, tenantId } });
  }

  updatePlan(
    id: string,
    data: Prisma.SubscriptionPlanUncheckedUpdateInput,
  ): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  deletePlan(id: string): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.delete({ where: { id } });
  }

  /** Replaces the whole day/slot tree in one transaction — deleting every
   * existing day cascades to its slots, then the new tree is created fresh.
   * Simpler and safer than diffing for a form that always submits the
   * complete tree on save. */
  async replacePlanDays(planId: string, days: PlanDayInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionPlanDay.deleteMany({ where: { planId } });
      for (const day of days) {
        await tx.subscriptionPlanDay.create({
          data: {
            planId,
            dayNumber: day.dayNumber,
            slots: {
              create: day.slots.map((slot) => ({
                slotType: slot.slotType,
                mealId: slot.mealId,
              })),
            },
          },
        });
      }
    });
  }

  // ─── Storefront (public) ─────────────────────────────────

  findPublishedPlans(tenantId: string): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { tenantId, isPublished: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPublishedPlanById(tenantId: string, id: string) {
    return this.prisma.subscriptionPlan.findFirst({
      where: { id, tenantId, isPublished: true, isActive: true },
      include: PLAN_WITH_DAYS_INCLUDE,
    });
  }

  /** Any active plan, published or not — SUPER_ADMIN/OWNER previewing, or
   * the subscribe flow re-checking the plan is still subscribable. */
  findPlanForSubscribe(
    tenantId: string,
    id: string,
  ): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findFirst({
      where: { id, tenantId, isPublished: true, isActive: true },
    });
  }

  // ─── Subscription lifecycle ──────────────────────────────

  createSubscription(
    data: Omit<Prisma.SubscriptionUncheckedCreateInput, 'tenantId'> & {
      tenantId: string;
    },
  ): Promise<Subscription> {
    return this.prisma.subscription.create({ data });
  }

  createInvoice(
    data: Prisma.SubscriptionInvoiceUncheckedCreateInput,
  ): Promise<SubscriptionInvoice> {
    return this.prisma.subscriptionInvoice.create({ data });
  }

  findInvoiceByRazorpayOrderId(
    razorpayOrderId: string,
  ): Promise<SubscriptionInvoice | null> {
    return this.prisma.subscriptionInvoice.findUnique({
      where: { razorpayOrderId },
    });
  }

  markInvoicePaid(
    id: string,
    razorpayPaymentId: string,
  ): Promise<SubscriptionInvoice> {
    return this.prisma.subscriptionInvoice.update({
      where: { id },
      data: { status: 'PAID', razorpayPaymentId },
    });
  }

  activateSubscription(
    id: string,
    data: { startDate: Date; cycleEnd: Date },
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate: data.startDate,
        cycleEnd: data.cycleEnd,
      },
    });
  }

  findSubscriptionById(
    tenantId: string,
    id: string,
  ): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({ where: { id, tenantId } });
  }

  findMySubscriptions(tenantId: string, userId: string) {
    return this.prisma.subscription.findMany({
      where: { tenantId, userId },
      include: { plan: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMySubscriptionById(tenantId: string, userId: string, id: string) {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId, userId },
      include: {
        plan: { include: PLAN_WITH_DAYS_INCLUDE },
        skips: { orderBy: { dateFrom: 'asc' } },
      },
    });
  }

  findAllForTenantAdmin(
    tenantId: string,
    skip: number,
    take: number,
  ): Promise<[Subscription[], number]> {
    return this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where: { tenantId },
        include: {
          plan: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscription.count({ where: { tenantId } }),
    ]);
  }

  createSkip(
    data: Prisma.SubscriptionSkipUncheckedCreateInput,
  ): Promise<SubscriptionSkip> {
    return this.prisma.subscriptionSkip.create({ data });
  }

  extendCycleEnd(
    id: string,
    newCycleEnd: Date,
    bankedDaysDelta: number,
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        cycleEnd: newCycleEnd,
        bankedDays: { increment: bankedDaysDelta },
      },
    });
  }

  cancelSubscription(id: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  // ─── Nightly materialization (system) ────────────────────

  findActiveSubscriptionsForMaterialization() {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        plan: true,
        address: true,
        tenant: { include: { businessProfile: true } },
      },
    });
  }

  findSkipForDate(
    subscriptionId: string,
    dateStr: string,
  ): Promise<SubscriptionSkip | null> {
    return this.prisma.subscriptionSkip.findFirst({
      where: {
        subscriptionId,
        dateFrom: { lte: dateStr },
        dateTo: { gte: dateStr },
      },
    });
  }

  findPlanDayWithSlots(planId: string, dayNumber: number) {
    return this.prisma.subscriptionPlanDay.findUnique({
      where: { planId_dayNumber: { planId, dayNumber } },
      include: { slots: { include: { meal: true } } },
    });
  }

  async createMaterializedOrder(input: {
    tenantId: string;
    userId: string;
    addressId: string;
    orderNumber: string;
    notes: string;
    items: {
      mealId: string;
      nameSnapshot: string;
      priceInPaiseSnapshot: number;
      quantity: number;
    }[];
  }): Promise<Order> {
    const subtotalInPaise = input.items.reduce(
      (sum, item) => sum + item.priceInPaiseSnapshot * item.quantity,
      0,
    );
    const today = new Date();
    return this.prisma.order.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        addressId: input.addressId,
        orderNumber: input.orderNumber,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        subtotalInPaise,
        totalInPaise: subtotalInPaise,
        deliveryDate: today,
        deliverySlotName: 'Subscription delivery',
        deliveryWindowStart: '00:00',
        deliveryWindowEnd: '23:59',
        notes: input.notes,
        items: { create: input.items },
      },
    });
  }

  advanceSubscriptionDay(
    id: string,
    nextPlanDayNumber: number,
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { nextPlanDayNumber },
    });
  }

  expireSubscription(id: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  }
}
