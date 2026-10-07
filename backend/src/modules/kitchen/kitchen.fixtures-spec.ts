/* Test builders shared by the kitchen specs. The "-spec.ts" ending keeps
 * it out of the build (tsconfig.build excludes *spec.ts) without Jest
 * running it as a test file (that needs ".spec.ts"). */
import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentMethod,
} from '../../generated/prisma';
import type { KitchenOrderRow } from './kitchen.repository';
import type { KitchenCard } from './kitchen-card.util';

export function kitchenRow(
  overrides: Partial<KitchenOrderRow> = {},
): KitchenOrderRow {
  return {
    id: 'o1',
    orderNumber: 'ORD-1001',
    status: OrderStatus.CONFIRMED,
    fulfillmentType: OrderFulfillmentType.DELIVERY,
    paymentMethod: PaymentMethod.RAZORPAY,
    isInstant: false,
    deliverySlotId: 'slot-lunch',
    deliverySlotName: 'Lunch',
    deliveryWindowStart: '12:30',
    deliveryWindowEnd: '14:00',
    deliveryDate: new Date('2026-10-03T00:00:00.000Z'),
    createdAt: new Date('2026-10-03T04:00:00.000Z'),
    notes: 'Ring the bell twice',
    prepNotes: 'No onions, nut allergy',
    subscriptionId: null,
    guestName: null,
    guestPhone: null,
    tableLabelSnapshot: null,
    addressLine1Snapshot: null,
    user: { firstName: 'Riya', lastName: 'Shah', email: 'riya@example.com' },
    address: {
      line1: '12 Green Park',
      line2: 'Satellite',
      city: 'Ahmedabad',
      pincode: '380015',
      contactPhone: '+91 98765 43210',
    },
    pickupKitchenZone: null,
    dineInKitchenZone: null,
    subscription: null,
    cancellationRequests: [],
    items: [
      {
        nameSnapshot: 'Paneer Tikka Bowl',
        quantity: 2,
        isFreeItem: false,
        meal: { category: { id: 'cat-bowls', name: 'Bowls' } },
        addons: [{ nameSnapshot: 'Extra roti', quantity: 2 }],
      },
    ],
    ...overrides,
  } as unknown as KitchenOrderRow;
}

export function kitchenCard(overrides: Partial<KitchenCard> = {}): KitchenCard {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'CONFIRMED',
    stage: 'NEW',
    fulfillmentType: OrderFulfillmentType.DELIVERY,
    isInstant: false,
    slotId: 'slot-lunch',
    slotName: 'Lunch',
    windowStart: '12:30',
    windowEnd: '14:00',
    dueMinutes: 750,
    placedAt: '2026-10-03T04:00:00.000Z',
    customerName: 'Riya S.',
    area: 'Satellite, Ahmedabad 380015',
    items: [
      {
        name: 'Paneer Bowl',
        quantity: 2,
        isFreeItem: false,
        categoryId: 'cat-bowls',
        categoryName: 'Bowls',
        addons: [],
      },
    ],
    prepNotes: null,
    deliveryNote: null,
    plan: null,
    dayChanged: false,
    cancelRequested: false,
    hasNotes: false,
    hasAddons: false,
    contact: null,
    ...overrides,
  };
}
