import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Address,
  CancellationRequestStatus,
  KitchenZone,
  Order,
  OrderFulfillmentType,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Refund,
  SubscriptionStatus,
} from '../../generated/prisma';
import { CreateRefundInput } from '../../shared-modules/refunds/refunds.repository';
import { type PlanDelivery, planDeliveryOf } from './plan-delivery.util';

export interface OrderItemAddonInput {
  addonItemId: string;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
}

export interface OrderItemInput {
  mealId: string;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
  isFreeItem?: boolean;
  addons?: OrderItemAddonInput[];
}

export interface AddressSnapshotInput {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  lat?: number | null;
  lng?: number | null;
}

/** A PICKUP order's pickup point at order time. Stored in the same
 * address-snapshot columns a delivery order uses (a pickup order has no
 * delivery address, so they're otherwise empty). */
export interface PickupSnapshotInput {
  address: string;
  lat: number;
  lng: number;
}

export interface CreateOrderInput {
  tenantId: string;
  // Absent only for a DINE_IN/TAKEAWAY walk-in with no linked account —
  // guestName/guestPhone carry identity instead in that case.
  userId?: string;
  guestName?: string;
  guestPhone?: string;
  fulfillmentType: OrderFulfillmentType;
  addressId?: string;
  addressSnapshot?: AddressSnapshotInput;
  pickupSnapshot?: PickupSnapshotInput;
  pickupKitchenZoneId?: string;
  // Which outlet took a DINE_IN/TAKEAWAY order — distinct from
  // pickupKitchenZoneId's "advance-booked pickup point" semantics.
  dineInKitchenZoneId?: string;
  tableId?: string;
  tableLabelSnapshot?: string;
  orderNumber: string;
  subtotalInPaise: number;
  discountInPaise: number;
  couponCode?: string;
  couponId?: string;
  deliveryFeeInPaise: number;
  totalInPaise: number;
  notes?: string;
  prepNotes?: string;
  items: OrderItemInput[];
  // Absent for a manual (CASH/UPI) order — there is no Razorpay order to
  // reference at all in that path.
  razorpayOrderId?: string;
  deliveryDate: Date;
  deliverySlotId: string | null;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  isInstant?: boolean;
  paymentMethod?: PaymentMethod;
  // Set only by the admin manual-order path — null for a customer-placed order.
  createdByUserId?: string;
}

const ORDER_INCLUDE = {
  items: { include: { addons: true } },
  address: true,
  pickupKitchenZone: true,
  table: true,
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

// Deliberately does NOT include the full User relation — that would leak
// passwordHash into any accidental JSON response. Internal-only (the
// notifications processor), never routed through a controller.
const ORDER_NOTIFICATION_INCLUDE = {
  items: { include: { addons: true } },
  address: true,
  pickupKitchenZone: true,
  user: {
    select: { email: true, firstName: true, lastName: true, phone: true },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithNotificationDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_NOTIFICATION_INCLUDE;
}>;

// Admin listing needs to show who placed the order, but must never expose
// passwordHash — select only the display fields, same principle as
// ORDER_NOTIFICATION_INCLUDE above.
const ORDER_ADMIN_INCLUDE = {
  items: { include: { addons: true } },
  address: true,
  pickupKitchenZone: true,
  dineInKitchenZone: true,
  table: true,
  user: { select: { firstName: true, lastName: true, email: true } },
  refunds: { orderBy: { createdAt: 'desc' } },
  // A pending customer "please cancel" — drives the admin/kitchen badge.
  cancellationRequests: {
    where: { status: CancellationRequestStatus.PENDING },
    select: { id: true, reason: true, note: true, createdAt: true },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithAdminDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_ADMIN_INCLUDE;
}>;

/**
 * Overlays the snapshotted address fields (captured at order time) onto the
 * live relation, so every display surface shows what the order was actually
 * placed with — not a later edit. A delivery order's snapshot replaces its
 * `address`; a PICKUP order's (pickup address + map point, in the same
 * columns) replaces its `pickupKitchenZone` pickup details. A pre-snapshot
 * historical order (addressLine1Snapshot null) keeps the live relation.
 * Also marks a subscription's daily delivery (`planDelivery`), which every
 * order screen shows as part of a plan, not as a priced order.
 */
/**
 * A Razorpay order still PENDING_PAYMENT is an abandoned checkout (the
 * customer closed the payment window) — never a real order to list. An
 * unpaid cash/UPI order is different: staff took it, and under cash on
 * delivery (Arpit, 2026-10-04) it's cooked and delivered before payment.
 */
export const NOT_ABANDONED_CHECKOUT: Prisma.OrderWhereInput = {
  NOT: {
    status: OrderStatus.PENDING_PAYMENT,
    paymentMethod: PaymentMethod.RAZORPAY,
  },
};

export function withAddressSnapshot<
  T extends { address: Address | null } & Order,
>(order: T): T & { planDelivery: PlanDelivery | null } {
  return {
    ...overlayAddressSnapshot(order),
    planDelivery: planDeliveryOf(order),
  };
}

function overlayAddressSnapshot<T extends { address: Address | null } & Order>(
  order: T,
): T {
  if (!order.addressLine1Snapshot) return order;
  const zone = (order as { pickupKitchenZone?: KitchenZone | null })
    .pickupKitchenZone;
  if (order.fulfillmentType === OrderFulfillmentType.PICKUP && zone) {
    return {
      ...order,
      pickupKitchenZone: {
        ...zone,
        pickupAddress: order.addressLine1Snapshot,
        lat: order.addressLatSnapshot ?? zone.lat,
        lng: order.addressLngSnapshot ?? zone.lng,
      },
    };
  }
  if (!order.address) return order;
  return {
    ...order,
    address: {
      ...order.address,
      line1: order.addressLine1Snapshot,
      line2: order.addressLine2Snapshot,
      city: order.addressCitySnapshot ?? order.address.city,
      state: order.addressStateSnapshot ?? order.address.state,
      pincode: order.addressPincodeSnapshot ?? order.address.pincode,
      contactPhone:
        order.addressContactPhoneSnapshot ?? order.address.contactPhone,
      lat: order.addressLatSnapshot ?? order.address.lat,
      lng: order.addressLngSnapshot ?? order.address.lng,
    },
  };
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrderInput): Promise<OrderWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          fulfillmentType: input.fulfillmentType,
          addressId: input.addressId,
          addressLine1Snapshot:
            input.addressSnapshot?.line1 ?? input.pickupSnapshot?.address,
          addressLine2Snapshot: input.addressSnapshot?.line2,
          addressCitySnapshot: input.addressSnapshot?.city,
          addressStateSnapshot: input.addressSnapshot?.state,
          addressPincodeSnapshot: input.addressSnapshot?.pincode,
          addressContactPhoneSnapshot: input.addressSnapshot?.contactPhone,
          addressLatSnapshot:
            input.addressSnapshot?.lat ?? input.pickupSnapshot?.lat,
          addressLngSnapshot:
            input.addressSnapshot?.lng ?? input.pickupSnapshot?.lng,
          pickupKitchenZoneId: input.pickupKitchenZoneId,
          dineInKitchenZoneId: input.dineInKitchenZoneId,
          tableId: input.tableId,
          tableLabelSnapshot: input.tableLabelSnapshot,
          orderNumber: input.orderNumber,
          subtotalInPaise: input.subtotalInPaise,
          discountInPaise: input.discountInPaise,
          couponCode: input.couponCode,
          deliveryFeeInPaise: input.deliveryFeeInPaise,
          totalInPaise: input.totalInPaise,
          notes: input.notes,
          prepNotes: input.prepNotes,
          razorpayOrderId: input.razorpayOrderId,
          deliveryDate: input.deliveryDate,
          deliverySlotId: input.deliverySlotId,
          deliverySlotName: input.deliverySlotName,
          deliveryWindowStart: input.deliveryWindowStart,
          deliveryWindowEnd: input.deliveryWindowEnd,
          isInstant: input.isInstant ?? false,
          paymentMethod: input.paymentMethod ?? PaymentMethod.RAZORPAY,
          createdByUserId: input.createdByUserId,
          items: {
            create: input.items.map((item) => ({
              mealId: item.mealId,
              nameSnapshot: item.nameSnapshot,
              priceInPaiseSnapshot: item.priceInPaiseSnapshot,
              quantity: item.quantity,
              isFreeItem: item.isFreeItem ?? false,
              addons: item.addons?.length
                ? {
                    create: item.addons.map((addon) => ({
                      addonItemId: addon.addonItemId,
                      nameSnapshot: addon.nameSnapshot,
                      priceInPaiseSnapshot: addon.priceInPaiseSnapshot,
                      quantity: addon.quantity,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      // Coupons require a real linked customer (never a guest walk-in) — the
      // dine-in path never sets couponId without also setting userId.
      if (input.couponId && input.userId) {
        await tx.couponRedemption.create({
          data: {
            tenantId: input.tenantId,
            couponId: input.couponId,
            userId: input.userId,
            orderId: order.id,
          },
        });
      }

      return withAddressSnapshot(order);
    });
  }

  async findById(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<OrderWithDetails | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, userId },
      include: ORDER_INCLUDE,
    });
    return order && withAddressSnapshot(order);
  }

  findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { razorpayOrderId } });
  }

  async findForNotification(
    tenantId: string,
    id: string,
  ): Promise<OrderWithNotificationDetails | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: ORDER_NOTIFICATION_INCLUDE,
    });
    return order && withAddressSnapshot(order);
  }

  /**
   * Excludes abandoned online checkouts (see NOT_ABANDONED_CHECKOUT); a
   * cash/UPI order staff took for this customer shows even before it's
   * paid — it's a real cash-on-delivery order.
   */
  async findAllForUser(
    tenantId: string,
    userId: string,
    skip: number,
    take: number,
  ): Promise<[OrderWithDetails[], number]> {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      userId,
      ...NOT_ABANDONED_CHECKOUT,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return [data.map(withAddressSnapshot), total];
  }

  /** Idempotent — a second call for an already-confirmed order is a no-op. */
  async markPaid(id: string, razorpayPaymentId: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
        razorpayPaymentId,
      },
    });
  }

  /** Online orders still awaiting payment, created in [from, to) — the
   * payment-check job asks Razorpay about each. Oldest first, capped. */
  findPendingRazorpayOrders(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PENDING,
        razorpayOrderId: { not: null },
        createdAt: { gte: from, lt: to },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /** Online orders still PENDING created before `before` — the customer
   * never paid — become FAILED. Only orders that actually went to Razorpay
   * checkout (paymentMethod merely defaults to RAZORPAY, e.g. on a dine-in
   * tab). Returns how many. */
  async markStaleRazorpayOrdersFailed(before: Date): Promise<number> {
    const { count } = await this.prisma.order.updateMany({
      where: {
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PENDING,
        razorpayOrderId: { not: null },
        createdAt: { lt: before },
      },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
    return count;
  }

  /** Never downgrades a PAID order: Razorpay can deliver a stale
   * `payment.failed` (an earlier attempt) after a retry already captured,
   * since webhooks arrive out of order and get retried. Returns whether
   * anything changed. */
  async markFailed(id: string): Promise<boolean> {
    const { count } = await this.prisma.order.updateMany({
      where: { id, paymentStatus: { not: PaymentStatus.PAID } },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
    return count > 0;
  }

  /** Confirms a manually-created (CASH/UPI) order once payment is actually
   * collected — the admin equivalent of markPaid(), with no razorpayPaymentId
   * since there's no gateway involved. `paymentMethod` is only for DINE_IN/
   * TAKEAWAY, where staff genuinely doesn't know cash-vs-UPI until the guest
   * pays at the end of the meal — every other manual order already commits
   * to CASH/UPI at creation and never changes it here. */
  markPaidManually(
    id: string,
    paymentMethod?: PaymentMethod,
    keepStatus = false,
  ): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        // keepStatus: the kitchen already moved it on (a dine-in table pays
        // after eating) — paying must not pull it back to CONFIRMED.
        ...(keepStatus ? {} : { status: OrderStatus.CONFIRMED }),
        ...(paymentMethod ? { paymentMethod } : {}),
      },
    });
  }

  /** Appends another round of items to a still-open DINE_IN/TAKEAWAY order —
   * the "running order" a POS keeps adding to across multiple KOT rounds.
   * Only ever adds; there's no remove/edit in v1 — cancel the whole order if
   * something was punched in wrong. */
  async addItems(
    id: string,
    items: OrderItemInput[],
    additionalSubtotalInPaise: number,
    additionalDiscountInPaise: number,
  ): Promise<OrderWithAdminDetails> {
    return this.prisma.$transaction(async (tx) => {
      // One create per line (not createMany) so each line's add-ons are
      // saved with it — the round's subtotal already charges for them.
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: id,
            mealId: item.mealId,
            nameSnapshot: item.nameSnapshot,
            priceInPaiseSnapshot: item.priceInPaiseSnapshot,
            quantity: item.quantity,
            isFreeItem: item.isFreeItem ?? false,
            addons: item.addons?.length
              ? {
                  create: item.addons.map((addon) => ({
                    addonItemId: addon.addonItemId,
                    nameSnapshot: addon.nameSnapshot,
                    priceInPaiseSnapshot: addon.priceInPaiseSnapshot,
                    quantity: addon.quantity,
                  })),
                }
              : undefined,
          },
        });
      }
      const order = await tx.order.update({
        where: { id },
        data: {
          subtotalInPaise: { increment: additionalSubtotalInPaise },
          discountInPaise: { increment: additionalDiscountInPaise },
          totalInPaise: {
            increment: additionalSubtotalInPaise - additionalDiscountInPaise,
          },
        },
        include: ORDER_ADMIN_INCLUDE,
      });
      return withAddressSnapshot(order);
    });
  }

  /** Assigns or reassigns which table a DINE_IN order is sitting at — table
   * can start unset (a seated-but-not-yet-placed edge case) or change if the
   * party actually moved tables. */
  async assignTable(
    id: string,
    tableId: string,
    tableLabelSnapshot: string,
  ): Promise<OrderWithAdminDetails> {
    const order = await this.prisma.order.update({
      where: { id },
      data: { tableId, tableLabelSnapshot },
      include: ORDER_ADMIN_INCLUDE,
    });
    return withAddressSnapshot(order);
  }

  /**
   * Hides abandoned online checkouts (see NOT_ABANDONED_CHECKOUT) but keeps
   * a staff-taken cash/UPI order that's still awaiting payment — cash on
   * delivery is cooked and delivered first, then marked paid. Filtering by
   * PENDING_PAYMENT therefore lists just those awaiting-payment orders.
   */
  async findAllForTenant(
    tenantId: string,
    skip: number,
    take: number,
    status?: OrderStatus,
    fulfillmentType?: OrderFulfillmentType,
    cancelRequested?: boolean,
  ): Promise<[OrderWithAdminDetails[], number]> {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...NOT_ABANDONED_CHECKOUT,
      ...(fulfillmentType ? { fulfillmentType } : {}),
      ...(cancelRequested
        ? {
            cancellationRequests: {
              some: { status: CancellationRequestStatus.PENDING },
            },
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: ORDER_ADMIN_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return [data.map(withAddressSnapshot), total];
  }

  async findByIdForTenant(
    tenantId: string,
    id: string,
  ): Promise<OrderWithAdminDetails | null> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: ORDER_ADMIN_INCLUDE,
    });
    return order && withAddressSnapshot(order);
  }

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  /** Cancels and records the refund in one transaction, and only if the
   * order isn't already cancelled — a double-clicked (or concurrent) cancel
   * must never record two refunds. Returns null when it was already
   * cancelled. */
  async cancelWithRefund(
    id: string,
    data: { cancelledByUserId: string; cancellationReason?: string },
    refund: CreateRefundInput,
  ): Promise<{
    order: OrderWithAdminDetails;
    refund: Refund;
    approvedRequest: boolean;
  } | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: { not: OrderStatus.CANCELLED } },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
          cancelledAt: new Date(),
          cancelledByUserId: data.cancelledByUserId,
          cancellationReason: data.cancellationReason,
        },
      });
      if (count === 0) return null;
      const createdRefund = await tx.refund.create({ data: refund });
      // A pending customer request for this order is answered by this very
      // cancel — closed in the same transaction so it can't stay "pending"
      // on a cancelled order.
      const approved = await tx.customerCancellationRequest.updateMany({
        where: { orderId: id, status: CancellationRequestStatus.PENDING },
        data: {
          status: CancellationRequestStatus.APPROVED,
          resolvedAt: new Date(),
          resolvedByUserId: data.cancelledByUserId,
        },
      });
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: ORDER_ADMIN_INCLUDE,
      });
      return {
        order: withAddressSnapshot(order),
        refund: createdRefund,
        approvedRequest: approved.count > 0,
      };
    });
  }

  // ── Overview dashboard aggregates ─────────────────────────

  /** Paid food orders in [since, until] — the raw dataset both the fixed today/last-7-days tiles and the (separately ranged) revenue trend are bucketed from. A subscription's daily delivery is excluded: no money changes hands for it (the plan was paid for up front — see findPlanSalesInRange). */
  findPaidOrdersInRange(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<{ createdAt: Date; totalInPaise: number }[]> {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        paymentStatus: PaymentStatus.PAID,
        subscriptionId: null,
        createdAt: { gte: since, lte: until },
      },
      select: { createdAt: true, totalInPaise: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Plans bought in [since, until] (an abandoned checkout never counts) —
   * the same definition Subscriptions → Analytics uses for gross revenue. */
  findPlanSalesInRange(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<{ createdAt: Date; priceInPaiseSnapshot: number }[]> {
    return this.prisma.subscription.findMany({
      where: {
        tenantId,
        status: { not: SubscriptionStatus.PENDING_PAYMENT },
        createdAt: { gte: since, lte: until },
      },
      select: { createdAt: true, priceInPaiseSnapshot: true },
    });
  }

  countActiveOrders(tenantId: string): Promise<number> {
    return this.prisma.order.count({
      where: {
        tenantId,
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
    });
  }

  async getStatusBreakdown(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<{ status: OrderStatus; count: number }[]> {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: since, lte: until } },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }

  /** Paid food orders plus plans bought — real money in, never a
   * subscription's daily deliveries. */
  async getAllTimeRevenue(
    tenantId: string,
  ): Promise<{ orders: number; plans: number; revenueInPaise: number }> {
    const [orders, plans] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          tenantId,
          paymentStatus: PaymentStatus.PAID,
          subscriptionId: null,
        },
        _sum: { totalInPaise: true },
        _count: { _all: true },
      }),
      this.prisma.subscription.aggregate({
        where: {
          tenantId,
          status: { not: SubscriptionStatus.PENDING_PAYMENT },
        },
        _sum: { priceInPaiseSnapshot: true },
        _count: { _all: true },
      }),
    ]);
    return {
      orders: orders._count._all,
      plans: plans._count._all,
      revenueInPaise:
        (orders._sum.totalInPaise ?? 0) +
        (plans._sum.priceInPaiseSnapshot ?? 0),
    };
  }

  async getTopMeals(
    tenantId: string,
    since: Date,
    until: Date,
    take: number,
  ): Promise<{ mealId: string | null; name: string; quantitySold: number }[]> {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['mealId', 'nameSnapshot'],
      where: {
        order: {
          tenantId,
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: since, lte: until },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });
    return grouped.map((g) => ({
      mealId: g.mealId,
      name: g.nameSnapshot,
      quantitySold: g._sum.quantity ?? 0,
    }));
  }
}
