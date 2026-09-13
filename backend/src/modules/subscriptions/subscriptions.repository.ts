import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { withAddressSnapshot } from '../orders/orders.repository';
import {
  DeliverySlot,
  Order,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Subscription,
  SubscriptionDayOverride,
  SubscriptionDisruption,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionSettings,
  SubscriptionSkip,
  SubscriptionStatus,
} from '../../generated/prisma';

export interface PlanDayInput {
  dayNumber?: number;
  weekNumber?: number;
  weekday?: number;
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
            weekNumber: day.weekNumber,
            weekday: day.weekday,
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

  /**
   * Excludes PENDING_PAYMENT — same "abandoned checkout" reasoning as
   * findAllForTenantAdmin: a subscription only ever leaves PENDING_PAYMENT
   * by turning ACTIVE on successful payment, so one still stuck there is a
   * closed/failed checkout, not a real subscription to show the customer.
   */
  findMySubscriptions(tenantId: string, userId: string) {
    return this.prisma.subscription.findMany({
      where: {
        tenantId,
        userId,
        status: { not: SubscriptionStatus.PENDING_PAYMENT },
      },
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
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  // ─── Admin analytics ──────────────────────────────────────

  /** Every real (non-abandoned-checkout) subscription started in range —
   * the base dataset for new-subscriber counts, gross revenue, the trend
   * chart, and the plan breakdown, all derived from this one query so they
   * can never drift from each other. */
  findRealSubscriptionsInRange(
    tenantId: string,
    since: Date,
    until: Date,
    planId?: string,
  ): Promise<
    { createdAt: Date; priceInPaiseSnapshot: number; planId: string }[]
  > {
    return this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: { not: SubscriptionStatus.PENDING_PAYMENT },
        createdAt: { gte: since, lte: until },
        ...(planId ? { planId } : {}),
      },
      select: { createdAt: true, priceInPaiseSnapshot: true, planId: true },
    });
  }

  countActiveSubscribers(tenantId: string, planId?: string): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        ...(planId ? { planId } : {}),
      },
    });
  }

  /** Refunds against a subscription cancellation in range — always via
   * `subscriptionId`, never `orderId` (that's the Order-side refund total,
   * a different metric). */
  findSubscriptionRefundsInRange(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<{ createdAt: Date; netRefundInPaise: number }[]> {
    return this.prisma.refund.findMany({
      where: {
        tenantId,
        subscriptionId: { not: null },
        createdAt: { gte: since, lte: until },
      },
      select: { createdAt: true, netRefundInPaise: true },
    });
  }

  async getPlanBreakdownInRange(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<
    {
      planId: string;
      planName: string;
      subscriberCount: number;
      revenueInPaise: number;
    }[]
  > {
    const grouped = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        tenantId,
        status: { not: SubscriptionStatus.PENDING_PAYMENT },
        createdAt: { gte: since, lte: until },
      },
      _count: { _all: true },
      _sum: { priceInPaiseSnapshot: true },
    });
    if (grouped.length === 0) return [];
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { id: { in: grouped.map((g) => g.planId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(plans.map((p) => [p.id, p.name]));
    return grouped.map((g) => ({
      planId: g.planId,
      planName: nameById.get(g.planId) ?? 'Unknown plan',
      subscriberCount: g._count._all,
      revenueInPaise: g._sum.priceInPaiseSnapshot ?? 0,
    }));
  }

  /** ACTIVE subscriptions whose cycleEnd falls within the given tenant-
   * local date window — the "expiring soon" drill-down list. */
  findExpiringSoon(tenantId: string, fromDateStr: string, toDateStr: string) {
    return this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
        cycleEnd: {
          gte: new Date(`${fromDateStr}T00:00:00.000Z`),
          lte: new Date(`${toDateStr}T23:59:59.999Z`),
        },
      },
      include: {
        plan: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { cycleEnd: 'asc' },
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

  /** Customer self-service cancel — stamps cancelledAt (so analytics counts
   * it) but never cancelledByUserId/cancellationReason, which stay null and
   * distinguish "customer cancelled themselves" from the admin cancel-
   * refund path below in any listing that reads this row later. */
  cancelSubscription(id: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  /** Admin cancel-with-refund path — distinct from the plain
   * cancelSubscription() above (customer self-service, no refund trail). */
  cancelWithRefund(
    id: string,
    data: { cancelledByUserId: string; cancellationReason?: string },
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: data.cancelledByUserId,
        cancellationReason: data.cancellationReason,
      },
    });
  }

  /** The subscription's original signup payment — a customer subscription
   * is a one-time upfront charge for the whole plan duration (not a
   * recurring Razorpay Subscription like PlatformSubscription), so this is
   * the one payment a Razorpay refund would target. */
  findPaidInvoiceBySubscriptionId(
    subscriptionId: string,
  ): Promise<SubscriptionInvoice | null> {
    return this.prisma.subscriptionInvoice.findFirst({
      where: { subscriptionId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** How many days have actually been materialized (delivered) so far —
   * the basis for the refund-preview's pending-days proration. A skipped/
   * banked day never created an Order, so it correctly still counts as
   * "pending" until it's eventually delivered on a later date. */
  countMaterializedOrders(subscriptionId: string): Promise<number> {
    return this.prisma.order.count({ where: { subscriptionId } });
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

  /** Unpaginated — a whole-plan disruption needs every currently-ACTIVE
   * subscriber at once, not a page of them. */
  findActiveSubscriptionsForPlan(
    tenantId: string,
    planId: string,
  ): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { tenantId, planId, status: SubscriptionStatus.ACTIVE },
    });
  }

  /** One bulk query over every SubscriptionPlanDay+slot for a plan, reduced
   * to the set of "{weekNumber}-{weekday}" keys that have >=1 slot checked
   * at all — the plan's real WEEKLY_FIXED delivery days. Deliberately NOT
   * "has a decided meal" — a checked-but-TBD slot (owner hasn't picked a
   * meal yet) still counts as a real day per materializeOne()'s own
   * existing rule ("skipped [no order] but still consumes a day count,
   * exactly like a customer's own unfilled custom-plan selection"); only a
   * weekday with ZERO checked slots at all (nothing authored for it, ever)
   * is genuinely "off." A day with zero SubscriptionPlanDay rows at all
   * (the weekday was never even submitted) is equally off — `days` simply
   * won't contain a key for it, so it's excluded the same way. Feeds
   * PlanScheduleUtil.advanceRealDeliveryDays for off-day-aware banking,
   * EXTEND_TO_COMPENSATE cycleEnd math, and the customer-facing plan
   * preview window. RELATIVE_DAY plans never call this (no off-day concept
   * there). */
  async findPlanDeliveryDayKeys(planId: string): Promise<Set<string>> {
    const days = await this.prisma.subscriptionPlanDay.findMany({
      where: { planId, weekNumber: { not: null } },
      include: { slots: { select: { id: true } } },
    });
    const keys = new Set<string>();
    for (const day of days) {
      if (day.slots.length > 0) {
        keys.add(`${day.weekNumber}-${day.weekday}`);
      }
    }
    return keys;
  }

  /** Lightweight schedule-config fetch for the cycleEnd/banking math — no
   * publish/active filter, since a plan can be unpublished while it still
   * has live subscribers whose banking math must keep working. */
  findPlanScheduleConfig(id: string) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id },
      select: {
        schedulingMode: true,
        weekCount: true,
        scheduleAnchorDate: true,
        durationDays: true,
        offDayHandling: true,
      },
    });
  }

  createDisruption(
    data: Prisma.SubscriptionDisruptionUncheckedCreateInput,
  ): Promise<SubscriptionDisruption> {
    return this.prisma.subscriptionDisruption.create({ data });
  }

  async findDisruptionsForAdmin(
    tenantId: string,
    skip: number,
    take: number,
  ): Promise<[SubscriptionDisruption[], number]> {
    return this.prisma.$transaction([
      this.prisma.subscriptionDisruption.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          plan: { select: { name: true } },
          _count: { select: { skips: true } },
        },
      }),
      this.prisma.subscriptionDisruption.count({ where: { tenantId } }),
    ]);
  }

  /** Address/user/plan shape the disruption-notice notification job needs. */
  findSubscriptionForNotification(tenantId: string, id: string) {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        address: { select: { contactPhone: true } },
        plan: { select: { name: true } },
      },
    });
  }

  // ─── Tenant subscription settings ────────────────────────

  findSettings(tenantId: string): Promise<SubscriptionSettings | null> {
    return this.prisma.subscriptionSettings.findUnique({ where: { tenantId } });
  }

  upsertSettings(
    tenantId: string,
    data: {
      isEnabled?: boolean;
      isAcceptingNewSubscriptions?: boolean;
      closureReason?: string | null;
      noticeHoursBeforeDelivery?: number;
      startDateLeadDays?: number;
      showOnHomepage?: boolean;
      homepageTitle?: string;
      homepageDescription?: string;
      plansPageTitle?: string;
      plansPageSubtitle?: string;
      whySubscribeEnabled?: boolean;
      faqEnabled?: boolean;
      contactCtaEnabled?: boolean;
      contactCtaTitle?: string;
      contactCtaDescription?: string;
      contactEmail?: string;
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
    data: {
      addressId?: string | null;
      deliverySlotId?: string | null;
      note?: string | null;
    },
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

  /** Same shape as findActiveSubscriptionsForMaterialization(), for a single
   * subscription — used by verifyPayment()'s same-day inline materialize
   * call (startDateLeadDays === 0), which can't wait for the nightly job. */
  findSubscriptionForMaterialization(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
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

  /** WEEKLY_FIXED counterpart to findPlanDayWithSlots — looks up a day by
   * its fixed (week, real weekday) key instead of a relative dayNumber. */
  findPlanDayByWeekAndWeekday(
    planId: string,
    weekNumber: number,
    weekday: number,
  ) {
    return this.prisma.subscriptionPlanDay.findUnique({
      where: { planId_weekNumber_weekday: { planId, weekNumber, weekday } },
      include: { slots: { include: { meal: true } } },
    });
  }

  /** Any subscription ever created against this plan, any status — used to
   * block a schedulingMode change once a plan is no longer purely
   * hypothetical (neither mode's per-subscriber bookkeeping handles a live
   * plan switching semantics mid-flight). */
  countSubscriptionsForPlan(planId: string): Promise<number> {
    return this.prisma.subscription.count({ where: { planId } });
  }

  /** Active subscriber count for a plan — the multiplier behind the kitchen
   * prep planner's per-day meal quantities. `excludeSkippedOnDate`, when
   * given a real date, subtracts anyone with a skip/pause covering that
   * exact date (SubscriptionSkip stores both under the same dateFrom/dateTo
   * range) — only meaningful for a WEEKLY_FIXED plan's "today" projection,
   * where every subscriber shares the same real date. Left unset for a
   * RELATIVE_DAY plan's hypothetical "if everyone hit day N" projection,
   * since there "today" isn't a single shared date to check skips against. */
  countActiveSubscriptionsForPlan(
    tenantId: string,
    planId: string,
    excludeSkippedOnDate?: string,
  ): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        tenantId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        ...(excludeSkippedOnDate
          ? {
              skips: {
                none: {
                  dateFrom: { lte: excludeSkippedOnDate },
                  dateTo: { gte: excludeSkippedOnDate },
                },
              },
            }
          : {}),
      },
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
    // Snapshot the address as it stands right now, at materialization time —
    // same rule as a regular customer-placed order (see Order model
    // comment): a later edit/delete of this Address must never rewrite or
    // break an already-materialized day's order.
    const address = await this.prisma.address.findUniqueOrThrow({
      where: { id: input.addressId },
    });
    return this.prisma.order.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        addressId: input.addressId,
        addressLine1Snapshot: address.line1,
        addressLine2Snapshot: address.line2,
        addressCitySnapshot: address.city,
        addressStateSnapshot: address.state,
        addressPincodeSnapshot: address.pincode,
        addressContactPhoneSnapshot: address.contactPhone,
        addressLatSnapshot: address.lat,
        addressLngSnapshot: address.lng,
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
  async findSubscriptionOrdersInRange(
    tenantId: string,
    queryStart: Date,
    queryEnd: Date,
  ) {
    const orders = await this.prisma.order.findMany({
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
    return orders.map(withAddressSnapshot);
  }
}
