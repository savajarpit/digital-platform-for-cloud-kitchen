import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentMethod,
} from '../../generated/prisma';
import { DateUtil } from '../../common/utils/date.util';

/** The Kitchen screen's columns. NEW = confirmed, not started yet; DONE =
 * already handed to delivery/pickup/the table. */
export const KITCHEN_STAGES = ['NEW', 'PREPARING', 'READY', 'DONE'] as const;
export type KitchenStage = (typeof KITCHEN_STAGES)[number];

/** The only statuses kitchen staff can set — dispatch and delivery stay on
 * the Orders page. */
export const KITCHEN_TARGETS = ['PREPARING', 'READY'] as const;
export type KitchenTarget = (typeof KITCHEN_TARGETS)[number];

/** Every status a kitchen card can be in (the stage decides the rest). */
export const KITCHEN_QUERY_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

interface StageInput {
  status: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  paymentMethod: PaymentMethod;
}

export function isInStore(fulfillmentType: OrderFulfillmentType): boolean {
  return (
    fulfillmentType === OrderFulfillmentType.DINE_IN ||
    fulfillmentType === OrderFulfillmentType.TAKEAWAY
  );
}

/** Which column an order sits in, or null when it isn't the kitchen's yet
 * (unpaid online order) or any more (cancelled). A staff-taken cash/UPI
 * order is cooked before it's paid — a table settles after eating, and a
 * phone order is cash on delivery — so an unpaid one is already NEW. */
export function kitchenStageOf(order: StageInput): KitchenStage | null {
  switch (order.status) {
    case OrderStatus.CONFIRMED:
      return 'NEW';
    case OrderStatus.PENDING_PAYMENT:
      return order.paymentMethod !== PaymentMethod.RAZORPAY ? 'NEW' : null;
    case OrderStatus.PREPARING:
      return 'PREPARING';
    case OrderStatus.READY:
      return 'READY';
    case OrderStatus.OUT_FOR_DELIVERY:
    case OrderStatus.DELIVERED:
      return 'DONE';
    default:
      return null;
  }
}

/** The tenant-local day an order is cooked for. Scheduled orders store that
 * day as UTC midnight; counter orders (and plan deliveries made before that
 * convention) store a real moment, read in the tenant's timezone. */
export function kitchenDateStrOf(
  order: { deliveryDate: Date },
  timezone: string,
): string {
  const iso = order.deliveryDate.toISOString();
  if (iso.endsWith('T00:00:00.000Z')) return iso.slice(0, 10);
  return DateUtil.toTenantDateStr(order.deliveryDate, timezone);
}

export const KITCHEN_CANCEL_REQUESTED_MESSAGE =
  'The customer asked to cancel this order — answer the request on the Orders page first.';

/** Start (NEW → PREPARING), Mark ready (PREPARING → READY), or undo a
 * mistaken Mark ready (READY → PREPARING). Throws with a message staff can
 * act on for anything else. */
export function assertKitchenMove(
  order: StageInput & { cancelRequested: boolean },
  target: KitchenTarget,
): void {
  const stage = kitchenStageOf(order);
  if (stage === null) {
    throw new BadRequestException(
      order.status === OrderStatus.CANCELLED
        ? 'This order was cancelled.'
        : "This order isn't confirmed yet, so the kitchen can't start it.",
    );
  }
  if (stage === 'DONE') {
    throw new BadRequestException('This order has already left the kitchen.');
  }
  if (target === 'PREPARING') {
    if (stage === 'PREPARING') {
      throw new ConflictException('This order is already being prepared.');
    }
    if (stage === 'NEW' && order.cancelRequested) {
      throw new BadRequestException(KITCHEN_CANCEL_REQUESTED_MESSAGE);
    }
    return;
  }
  if (stage === 'READY') {
    throw new ConflictException('This order is already marked ready.');
  }
  if (stage === 'NEW') {
    throw new BadRequestException('Start preparing this order first.');
  }
}
