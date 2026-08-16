import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  DeliverySlot,
  Order,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Subscription,
  SubscriptionDayOverride,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionSettings,
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
    search?: string,
  ): Promise<[SubscriptionPlan[], number]> {
    const where: Prisma.SubscriptionPlanWhereInput = {
      tenantId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscriptionPlan.count({ where }),
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

  findPublishedPlans(
    tenantId: string,
    search?: string,
  ): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        tenantId,
        isPublished: true,
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
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

  findInvoiceBySubscriptionId(
    subscriptionId: string,
  ): Promise<SubscriptionInvoice | null> {
    return this.prisma.subscriptionInvoice.findFirst({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
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

  /** Only the invoice page needs the delivery address alongside the bare
   * subscription row — kept separate from findSubscriptionById() so every
   * other caller (ownership checks, cancel, day-override) doesn't pay for
   * a join it never uses. */
  findSubscriptionByIdWithAddress(tenantId: string, id: string) {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId },
      include: { address: true },
    });
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
        dayOverrides: true,
        address: true,
        deliverySlot: true,
      },
    });
  }

  /** Excludes PENDING_PAYMENT — an abandoned plan checkout, not a real subscriber. */
  findAllForTenantAdmin(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
    planId?: string,
  ): Promise<[Subscription[], number]> {
    const where: Prisma.SubscriptionWhereInput = {
      tenantId,
      status: { not: SubscriptionStatus.PENDING_PAYMENT },
      ...(planId ? { planId } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          plan: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscription.count({ where }),
    ]);
  }

  findByIdForTenantAdmin(tenantId: string, id: string) {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        plan: { include: PLAN_WITH_DAYS_INCLUDE },
        skips: { orderBy: { dateFrom: 'asc' } },
        dayOverrides: true,
        address: true,
        deliverySlot: true,
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });
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

  /** Any ACTIVE subscription this user has for this plan — used at
   * subscribe-time to warn about stacking a concurrent duplicate. */
  findActiveSubscriptionForPlan(
    tenantId: string,
    userId: string,
    planId: string,
  ): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { tenantId, userId, planId, status: SubscriptionStatus.ACTIVE },
    });
  }

  // ─── Tenant subscription settings ────────────────────────

  findSettings(tenantId: string): Promise<SubscriptionSettings | null> {
    return this.prisma.subscriptionSettings.findUnique({ where: { tenantId } });
  }

  upsertSettings(
    tenantId: string,
    data: {
      isAcceptingNewSubscriptions?: boolean;
      closureReason?: string | null;
      noticeHoursBeforeDelivery?: number;
      showOnHomepage?: boolean;
    },
  ): Promise<SubscriptionSettings> {
    return this.prisma.subscriptionSettings.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
  }

  // ─── Per-day delivery overrides ──────────────────────────

  findDayOverride(
    subscriptionId: string,
    date: string,
  ): Promise<SubscriptionDayOverride | null> {
    return this.prisma.subscriptionDayOverride.findUnique({
      where: { subscriptionId_date: { subscriptionId, date } },
    });
  }

  upsertDayOverride(
    subscriptionId: string,
    date: string,
    data: { addressId?: string | null; deliverySlotId?: string | null },
  ): Promise<SubscriptionDayOverride> {
    return this.prisma.subscriptionDayOverride.upsert({
      where: { subscriptionId_date: { subscriptionId, date } },
      update: data,
      create: { subscriptionId, date, ...data },
    });
  }

  findDeliverySlotById(
    tenantId: string,
    id: string,
  ): Promise<DeliverySlot | null> {
    return this.prisma.deliverySlot.findFirst({ where: { id, tenantId } });
  }

  // ─── Nightly materialization (system) ────────────────────

  findActiveSubscriptionsForMaterialization() {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        plan: true,
        address: true,
        deliverySlot: true,
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

  /** Active subscriber count for a plan — the multiplier behind the kitchen
   * prep planner's per-day meal quantities. */
  countActiveSubscriptionsForPlan(
    tenantId: string,
    planId: string,
  ): Promise<number> {
    return this.prisma.subscription.count({
      where: { tenantId, planId, status: SubscriptionStatus.ACTIVE },
    });
  }

  async createMaterializedOrder(input: {
    tenantId: string;
    userId: string;
    subscriptionId: string;
    addressId: string;
    orderNumber: string;
    notes: string;
    deliverySlotId?: string;
    deliverySlotName: string;
    deliveryWindowStart: string;
    deliveryWindowEnd: string;
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
        subscriptionId: input.subscriptionId,
        addressId: input.addressId,
        orderNumber: input.orderNumber,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        subtotalInPaise,
        totalInPaise: subtotalInPaise,
        deliveryDate: today,
        deliverySlotId: input.deliverySlotId,
        deliverySlotName: input.deliverySlotName,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
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

  // ─── Admin: today's subscription deliveries ──────────────

  /** Widened ±1 day at the DB level (same over-fetch-then-filter-exact
   * principle as the overview chart's date bucketing) — the caller filters
   * to the exact tenant-local date string. */
  findSubscriptionOrdersInRange(
    tenantId: string,
    queryStart: Date,
    queryEnd: Date,
  ) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        subscriptionId: { not: null },
        deliveryDate: { gte: queryStart, lte: queryEnd },
      },
      include: {
        items: true,
        address: true,
        subscription: { select: { planNameSnapshot: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
