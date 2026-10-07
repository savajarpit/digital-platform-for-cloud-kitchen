import { OrderFulfillmentType } from '../../generated/prisma';
import { kitchenCard } from './kitchen.fixtures-spec';
import {
  INSTANT_SLOT,
  countByStage,
  matchesKitchenFilters,
  sortKitchenCards,
} from './kitchen-filters.util';
import { buildPrepSummary } from './kitchen-prep.util';

const plan = {
  subscriptionId: 's1',
  planId: 'p1',
  planName: 'Weight Loss',
  dayLabel: 'Day 3',
  customerNote: null,
};

describe('matchesKitchenFilters', () => {
  it('splits regular orders from plan deliveries', () => {
    const order = kitchenCard();
    const planDay = kitchenCard({ plan });
    expect(matchesKitchenFilters(order, { kind: 'ORDERS' })).toBe(true);
    expect(matchesKitchenFilters(planDay, { kind: 'ORDERS' })).toBe(false);
    expect(matchesKitchenFilters(planDay, { kind: 'PLAN' })).toBe(true);
    expect(matchesKitchenFilters(order, { kind: 'PLAN' })).toBe(false);
  });

  it('filters by slot, with instant orders as their own slot', () => {
    const instant = kitchenCard({ isInstant: true, slotId: null });
    expect(matchesKitchenFilters(kitchenCard(), { slot: 'slot-lunch' })).toBe(
      true,
    );
    expect(matchesKitchenFilters(kitchenCard(), { slot: 'slot-dinner' })).toBe(
      false,
    );
    expect(matchesKitchenFilters(instant, { slot: INSTANT_SLOT })).toBe(true);
    expect(matchesKitchenFilters(kitchenCard(), { slot: INSTANT_SLOT })).toBe(
      false,
    );
  });

  it('filters by order type, notes, add-ons, plan and changed days', () => {
    const card = kitchenCard({
      fulfillmentType: OrderFulfillmentType.PICKUP,
      hasNotes: true,
      plan,
      dayChanged: true,
    });
    expect(
      matchesKitchenFilters(card, {
        type: OrderFulfillmentType.PICKUP,
        hasNotes: true,
        planId: 'p1',
        changedOnly: true,
      }),
    ).toBe(true);
    expect(matchesKitchenFilters(card, { hasAddons: true })).toBe(false);
    expect(matchesKitchenFilters(card, { planId: 'p2' })).toBe(false);
    expect(
      matchesKitchenFilters(kitchenCard(), {
        type: OrderFulfillmentType.PICKUP,
      }),
    ).toBe(false);
  });
});

describe('countByStage and sortKitchenCards', () => {
  it('counts every column', () => {
    expect(
      countByStage([
        kitchenCard(),
        kitchenCard({ stage: 'READY' }),
        kitchenCard({ stage: 'READY' }),
      ]),
    ).toEqual({ NEW: 1, PREPARING: 0, READY: 2, DONE: 0 });
  });

  it('puts the earliest due first, then the earliest placed', () => {
    const late = kitchenCard({ id: 'late', dueMinutes: 1200 });
    const early = kitchenCard({ id: 'early', dueMinutes: 480 });
    const earlyPlacedFirst = kitchenCard({
      id: 'early-first',
      dueMinutes: 480,
      placedAt: '2026-10-03T01:00:00.000Z',
    });
    expect(
      sortKitchenCards([late, early, earlyPlacedFirst]).map((c) => c.id),
    ).toEqual(['early-first', 'early', 'late']);
    expect(
      sortKitchenCards([late, earlyPlacedFirst], 'placed').map((c) => c.id),
    ).toEqual(['early-first', 'late']);
  });
});

describe('buildPrepSummary', () => {
  const cards = [
    kitchenCard({
      items: [
        {
          name: 'Paneer Bowl',
          quantity: 2,
          isFreeItem: false,
          categoryId: 'cat-bowls',
          categoryName: 'Bowls',
          addons: [{ name: 'Extra roti', quantity: 3 }],
        },
        {
          name: 'Green Juice',
          quantity: 1,
          isFreeItem: false,
          categoryId: 'cat-drinks',
          categoryName: 'Beverages',
          addons: [],
        },
      ],
      prepNotes: 'No onions',
    }),
    kitchenCard({
      id: 'o2',
      stage: 'PREPARING',
      plan: { ...plan, customerNote: 'Less oil' },
    }),
    kitchenCard({ id: 'o3', stage: 'READY', prepNotes: 'Spicy' }),
  ];

  it('totals what is still to cook and what is done', () => {
    const summary = buildPrepSummary(cards);
    expect(summary.items).toEqual([
      { name: 'Paneer Bowl', categoryName: 'Bowls', toCook: 4, done: 2 },
      { name: 'Green Juice', categoryName: 'Beverages', toCook: 1, done: 0 },
    ]);
    expect(summary.addons).toEqual([{ name: 'Extra roti', quantity: 6 }]);
    expect(summary.ordersToCook).toBe(2);
  });

  it('lists notes on orders still to cook as special requests', () => {
    const summary = buildPrepSummary(cards);
    expect(summary.specialRequests.map((r) => [r.orderId, r.note])).toEqual([
      ['o1', 'No onions'],
      ['o2', 'Less oil'],
    ]);
    expect(summary.specialRequests[0].items).toBe(
      'Paneer Bowl ×2, Green Juice ×1',
    );
  });

  it('narrows to one category but still lists every category present', () => {
    const summary = buildPrepSummary(cards, 'cat-drinks');
    expect(summary.items.map((i) => i.name)).toEqual(['Green Juice']);
    expect(summary.ordersToCook).toBe(1);
    expect(summary.categories).toEqual([
      { id: 'cat-drinks', name: 'Beverages' },
      { id: 'cat-bowls', name: 'Bowls' },
    ]);
  });
});
