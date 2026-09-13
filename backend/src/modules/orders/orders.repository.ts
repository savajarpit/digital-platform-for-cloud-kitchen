import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Address,
  Order,
  OrderFulfillmentType,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../../generated/prisma';

export interface OrderItemInput {
  mealId: string;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
  isFreeItem?: boolean;
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
  items: true,
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
  items: true,
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
  items: true,
  address: true,
  pickupKitchenZone: true,
  dineInKitchenZone: true,
  table: true,
  user: { select: { firstName: true, lastName: true, email: true } },
  refunds: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

export type OrderWithAdminDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_ADMIN_INCLUDE;
}>;

/**
 * Overlays the snapshotted delivery-address fields (captured at order time)
 * onto the live `address` relation, so every display surface shows what was
 * actually delivered to — not a later edit to that Address row. Falls back
 * to the live relation untouched for a PICKUP order or a pre-snapshot
 * historical order (addressLine1Snapshot null), since there's nothing to
 * retroactively snapshot for those.
 */
export function withAddressSnapshot<
  T extends { address: Address | null } & Order,
>(order: T): T {
  if (!order.address || !order.addressLine1Snapshot) return order;
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
          addressLine1Snapshot: input.addressSnapshot?.line1,
          addressLine2Snapshot: input.addressSnapshot?.line2,
          addressCitySnapshot: input.addressSnapshot?.city,
          addressStateSnapshot: input.addressSnapshot?.state,
          addressPincodeSnapshot: input.addressSnapshot?.pincode,
          addressContactPhoneSnapshot: input.addressSnapshot?.contactPhone,
          addressLatSnapshot: input.addressSnapshot?.lat,
          addressLngSnapshot: input.addressSnapshot?.lng,
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
   * Excludes orders still stuck at PENDING_PAYMENT — a legitimate order
   * always flips to CONFIRMED (or FAILED) before the customer is ever
   * redirected back to look at their order list, so anything still
   * PENDING_PAYMENT by the time this query runs is an abandoned checkout
   * (closed the payment modal, never paid), not a real order to show.
   */
  async findAllForUser(
    tenantId: string,
    userId: string,
    skip: number,
    take: number,
  ): Promise<[OrderWithDetails[], number]> {
    const where = {
      tenantId,
      userId,
      status: { not: OrderStatus.PENDING_PAYMENT },
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

  markFailed(id: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  }

  /** Confirms a manually-created (CASH/UPI) order once payment is actually
   * collected — the admin equivalent of markPaid(), with no razorpayPaymentId
   * since there's no gateway involved. `paymentMethod` is only for DINE_IN/
   * TAKEAWAY, where staff genuinely doesn't know cash-vs-UPI until the guest
   * pays at the end of the meal — every other manual order already commits
   * to CASH/UPI at creation and never changes it here. */
  markPaidManually(id: string, paymentMethod?: PaymentMethod): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
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
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: id,
          mealId: item.mealId,
          nameSnapshot: item.nameSnapshot,
          priceInPaiseSnapshot: item.priceInPaiseSnapshot,
          quantity: item.quantity,
          isFreeItem: item.isFreeItem ?? false,
        })),
      });
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
   * Excludes PENDING_PAYMENT by default — same "abandoned checkout" reasoning
   * as findAllForUser, but here it's unconditional: admin never opts back
   * into seeing them, since ADMIN_SETTABLE_STATUSES doesn't include it either.
   */
  async findAllForTenant(
    tenantId: string,
    skip: number,
    take: number,
    status?: OrderStatus,
    fulfillmentType?: OrderFulfillmentType,
  ): Promise<[OrderWithAdminDetails[], number]> {
    const where = {
      tenantId,
      status: status ?? { not: OrderStatus.PENDING_PAYMENT },
      ...(fulfillmentType ? { fulfillmentType } : {}),
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

  async cancelWithRefund(
    id: string,
    data: { cancelledByUserId: string; cancellationReason?: string },
  ): Promise<OrderWithAdminDetails> {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        cancelledAt: new Date(),
        cancelledByUserId: data.cancelledByUserId,
        cancellationReason: data.cancellationReason,
      },
      include: ORDER_ADMIN_INCLUDE,
    });
    return withAddressSnapshot(order);
  }

  // ── Overview dashboard aggregates ─────────────────────────

  /** Paid orders in [since, until] — the raw dataset both the fixed today/last-7-days tiles and the (separately ranged) revenue trend are bucketed from. */
  findPaidOrdersInRange(
    tenantId: string,
    since: Date,
    until: Date,
  ): Promise<{ createdAt: Date; totalInPaise: number }[]> {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        paymentStatus: PaymentStatus.PAID,
        createdAt: { gte: since, lte: until },
      },
      select: { createdAt: true, totalInPaise: true },
      orderBy: { createdAt: 'asc' },
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

  async getAllTimeRevenue(
    tenantId: string,
  ): Promise<{ orders: number; revenueInPaise: number }> {
    const result = await this.prisma.order.aggregate({
      where: { tenantId, paymentStatus: PaymentStatus.PAID },
      _sum: { totalInPaise: true },
      _count: { _all: true },
    });
    return {
      orders: result._count._all,
      revenueInPaise: result._sum.totalInPaise ?? 0,
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
