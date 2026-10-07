import { OrderFulfillmentType } from '../../generated/prisma';
import { DateUtil } from '../../common/utils/date.util';
import { planDeliveryOf } from '../orders/plan-delivery.util';
import type { KitchenOrderRow } from './kitchen.repository';
import { isInStore, type KitchenStage } from './kitchen-rules';

export interface KitchenCardItem {
  name: string;
  quantity: number;
  isFreeItem: boolean;
  categoryId: string | null;
  categoryName: string | null;
  addons: { name: string; quantity: number }[];
}

/** One order as the kitchen sees it — no prices, and the customer's phone,
 * email and full address only for staff who can also manage orders. */
export interface KitchenCard {
  id: string;
  orderNumber: string;
  status: string;
  stage: KitchenStage;
  fulfillmentType: OrderFulfillmentType;
  isInstant: boolean;
  slotId: string | null;
  slotName: string;
  windowStart: string | null;
  windowEnd: string | null;
  /** Minutes after midnight the order is due — the default sort. */
  dueMinutes: number;
  placedAt: string;
  customerName: string;
  /** "Satellite, Ahmedabad 380015", "Table 4", "Pickup · Nikol" … */
  area: string | null;
  items: KitchenCardItem[];
  prepNotes: string | null;
  deliveryNote: string | null;
  plan: {
    subscriptionId: string;
    planId: string | null;
    planName: string;
    dayLabel: string;
    customerNote: string | null;
  } | null;
  /** The customer changed this plan day (address, time or note). */
  dayChanged: boolean;
  cancelRequested: boolean;
  hasNotes: boolean;
  hasAddons: boolean;
  contact: {
    fullName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
}

function fullNameOf(order: KitchenOrderRow): string {
  if (order.user) {
    return `${order.user.firstName} ${order.user.lastName ?? ''}`.trim();
  }
  return order.guestName?.trim() || 'Walk-in guest';
}

/** "Riya S." — enough to call out an order, without the full name. */
function shortNameOf(order: KitchenOrderRow): string {
  if (!order.user) return order.guestName?.trim() || 'Walk-in guest';
  const initial = order.user.lastName?.trim()[0];
  return initial
    ? `${order.user.firstName} ${initial.toUpperCase()}.`
    : order.user.firstName;
}

function areaOf(order: KitchenOrderRow): string | null {
  switch (order.fulfillmentType) {
    case OrderFulfillmentType.DINE_IN:
      return order.tableLabelSnapshot
        ? `Table ${order.tableLabelSnapshot}`
        : 'Dine-in';
    case OrderFulfillmentType.TAKEAWAY:
      return 'Takeaway';
    case OrderFulfillmentType.PICKUP:
      return order.pickupKitchenZone
        ? `Pickup · ${order.pickupKitchenZone.name}`
        : 'Pickup';
    default: {
      if (!order.address) return null;
      const place = [order.address.line2, order.address.city]
        .filter(Boolean)
        .join(', ');
      return `${place} ${order.address.pincode}`.trim();
    }
  }
}

/** A plan delivery with no delivery time picked (window 00:00–23:59). */
function isAnyTime(order: KitchenOrderRow): boolean {
  return (
    !order.deliverySlotId &&
    !order.isInstant &&
    order.deliveryWindowStart === '00:00' &&
    order.deliveryWindowEnd === '23:59'
  );
}

function dueMinutesOf(order: KitchenOrderRow, timezone: string): number {
  // No set time — after everything that has one.
  if (isAnyTime(order)) return 24 * 60;
  if (/^\d{2}:\d{2}$/.test(order.deliveryWindowStart)) {
    return DateUtil.hhmmToMinutes(order.deliveryWindowStart);
  }
  // A counter order has no window — it's due as soon as it's placed.
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(order.createdAt);
  return DateUtil.hhmmToMinutes(time);
}

export function toKitchenCard(
  order: KitchenOrderRow,
  opts: {
    stage: KitchenStage;
    timezone: string;
    canSeeContact: boolean;
    dayChanged: boolean;
  },
): KitchenCard {
  const planDelivery = planDeliveryOf(order);
  const items = order.items.map((item) => ({
    name: item.nameSnapshot,
    quantity: item.quantity,
    isFreeItem: item.isFreeItem,
    categoryId: item.meal?.category?.id ?? null,
    categoryName: item.meal?.category?.name ?? null,
    addons: item.addons.map((a) => ({
      name: a.nameSnapshot,
      quantity: a.quantity,
    })),
  }));
  const inStore = isInStore(order.fulfillmentType);
  const note = order.notes?.trim() || null;
  // A counter order's note is for the kitchen ("no onions") — nothing is
  // delivered. A plan delivery's notes column is the system label, its
  // customer note parsed out into `plan` instead.
  const prepNotes =
    [order.prepNotes?.trim(), inStore ? note : null]
      .filter(Boolean)
      .join(' · ') || null;
  const deliveryNote = planDelivery || inStore ? null : note;
  const noWindow = inStore || isAnyTime(order);
  const address = order.address;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    stage: opts.stage,
    fulfillmentType: order.fulfillmentType,
    isInstant: order.isInstant,
    slotId: order.deliverySlotId,
    slotName: isAnyTime(order) ? 'Any time' : order.deliverySlotName,
    windowStart: noWindow ? null : order.deliveryWindowStart,
    windowEnd: noWindow ? null : order.deliveryWindowEnd,
    dueMinutes: dueMinutesOf(order, opts.timezone),
    placedAt: order.createdAt.toISOString(),
    customerName: shortNameOf(order),
    area: areaOf(order),
    items,
    prepNotes,
    deliveryNote,
    plan: planDelivery && {
      ...planDelivery,
      planId: order.subscription?.planId ?? null,
    },
    dayChanged: opts.dayChanged,
    cancelRequested: order.cancellationRequests.length > 0,
    hasNotes: Boolean(prepNotes || planDelivery?.customerNote),
    hasAddons: items.some((i) => i.addons.length > 0),
    contact: opts.canSeeContact
      ? {
          fullName: fullNameOf(order),
          phone: address?.contactPhone ?? order.guestPhone ?? null,
          email: order.user?.email ?? null,
          address: address
            ? [address.line1, address.line2, address.city, address.pincode]
                .filter(Boolean)
                .join(', ')
            : null,
        }
      : null,
  };
}
