import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../../generated/prisma';

export interface OrderItemInput {
  mealId: string;
  nameSnapshot: string;
  priceInPaiseSnapshot: number;
  quantity: number;
}

export interface CreateOrderInput {
  tenantId: string;
  userId: string;
  addressId: string;
  orderNumber: string;
  subtotalInPaise: number;
  deliveryFeeInPaise: number;
  totalInPaise: number;
  notes?: string;
  items: OrderItemInput[];
  razorpayOrderId: string;
  deliveryDate: Date;
  deliverySlotId: string;
  deliverySlotName: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

const ORDER_INCLUDE = {
  items: true,
  address: true,
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
  user: {
    select: { email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithNotificationDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_NOTIFICATION_INCLUDE;
}>;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrderInput): Promise<OrderWithDetails> {
    return this.prisma.order.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        addressId: input.addressId,
        orderNumber: input.orderNumber,
        subtotalInPaise: input.subtotalInPaise,
        deliveryFeeInPaise: input.deliveryFeeInPaise,
        totalInPaise: input.totalInPaise,
        notes: input.notes,
        razorpayOrderId: input.razorpayOrderId,
        deliveryDate: input.deliveryDate,
        deliverySlotId: input.deliverySlotId,
        deliverySlotName: input.deliverySlotName,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
        items: {
          create: input.items.map((item) => ({
            mealId: item.mealId,
            nameSnapshot: item.nameSnapshot,
            priceInPaiseSnapshot: item.priceInPaiseSnapshot,
            quantity: item.quantity,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
  }

  findById(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<OrderWithDetails | null> {
    return this.prisma.order.findFirst({
      where: { id, tenantId, userId },
      include: ORDER_INCLUDE,
    });
  }

  findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { razorpayOrderId } });
  }

  findForNotification(
    tenantId: string,
    id: string,
  ): Promise<OrderWithNotificationDetails | null> {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: ORDER_NOTIFICATION_INCLUDE,
    });
  }

  findAllForUser(
    tenantId: string,
    userId: string,
  ): Promise<OrderWithDetails[]> {
    return this.prisma.order.findMany({
      where: { tenantId, userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
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
}
