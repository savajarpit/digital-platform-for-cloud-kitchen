import { OrderFulfillmentType } from '../../generated/prisma';
import type { KitchenOrderRow } from './kitchen.repository';
import { kitchenRow } from './kitchen.fixtures-spec';
import { toKitchenCard } from './kitchen-card.util';
import { matchesKitchenSearch } from './kitchen-filters.util';

const opts = {
  stage: 'NEW' as const,
  timezone: 'Asia/Kolkata',
  canSeeContact: false,
  dayChanged: false,
};

describe('toKitchenCard', () => {
  it('shows a short name and area, never prices or contact details', () => {
    const card = toKitchenCard(kitchenRow(), opts);
    expect(card.customerName).toBe('Riya S.');
    expect(card.area).toBe('Satellite, Ahmedabad 380015');
    expect(card.contact).toBeNull();
    expect(JSON.stringify(card)).not.toMatch(/Paise|98765|riya@/);
  });

  it('adds full contact details for staff who can manage orders', () => {
    const card = toKitchenCard(kitchenRow(), { ...opts, canSeeContact: true });
    expect(card.contact).toEqual({
      fullName: 'Riya Shah',
      phone: '+91 98765 43210',
      email: 'riya@example.com',
      address: '12 Green Park, Satellite, Ahmedabad, 380015',
    });
  });

  it('keeps cooking and delivery notes apart, and flags add-ons', () => {
    const card = toKitchenCard(kitchenRow(), opts);
    expect(card.prepNotes).toBe('No onions, nut allergy');
    expect(card.deliveryNote).toBe('Ring the bell twice');
    expect(card.hasNotes).toBe(true);
    expect(card.hasAddons).toBe(true);
    expect(card.items[0].addons).toEqual([{ name: 'Extra roti', quantity: 2 }]);
    expect(card.dueMinutes).toBe(12 * 60 + 30);
  });

  it("reads a plan delivery's day note as the cooking note", () => {
    const card = toKitchenCard(
      kitchenRow({
        subscriptionId: 'sub-1',
        subscription: { planId: 'plan-1' },
        prepNotes: null,
        notes: 'Subscription: Weight Loss — Day 3 — Note: Pack extra salad',
      } as Partial<KitchenOrderRow>),
      { ...opts, dayChanged: true },
    );
    expect(card.plan).toEqual({
      subscriptionId: 'sub-1',
      planId: 'plan-1',
      planName: 'Weight Loss',
      dayLabel: 'Day 3',
      customerNote: 'Pack extra salad',
    });
    expect(card.deliveryNote).toBeNull();
    expect(card.hasNotes).toBe(true);
    expect(card.dayChanged).toBe(true);
  });

  it('labels counter orders by table and sorts them by when they were placed', () => {
    const card = toKitchenCard(
      kitchenRow({
        fulfillmentType: OrderFulfillmentType.DINE_IN,
        tableLabelSnapshot: '4',
        user: null,
        guestName: 'Mehta',
        address: null,
        deliveryWindowStart: '-',
        deliveryWindowEnd: '-',
        createdAt: new Date('2026-10-03T07:15:00.000Z'),
      }),
      opts,
    );
    expect(card.area).toBe('Table 4');
    expect(card.customerName).toBe('Mehta');
    // The counter's note is a cooking note — nothing gets delivered.
    expect(card.prepNotes).toBe('No onions, nut allergy · Ring the bell twice');
    expect(card.deliveryNote).toBeNull();
    expect(card.windowStart).toBeNull();
    // 07:15 UTC is 12:45 in India.
    expect(card.dueMinutes).toBe(12 * 60 + 45);
  });

  it('shows a plan day with no set time as "Any time", after timed orders', () => {
    const card = toKitchenCard(
      kitchenRow({
        deliverySlotId: null,
        deliverySlotName: 'Subscription delivery',
        deliveryWindowStart: '00:00',
        deliveryWindowEnd: '23:59',
      }),
      opts,
    );
    expect(card.slotName).toBe('Any time');
    expect(card.windowStart).toBeNull();
    expect(card.dueMinutes).toBe(24 * 60);
  });
});

describe('matchesKitchenSearch', () => {
  const row = kitchenRow();

  it.each([
    'ORD-1001',
    'riya',
    'riya shah',
    'RIYA@EXAMPLE',
    'green park',
    '380015',
    'paneer',
    'extra roti',
    'allergy',
  ])('finds an order by %s', (q) => {
    expect(matchesKitchenSearch(row, q)).toBe(true);
  });

  it('finds a phone number however it is typed', () => {
    expect(matchesKitchenSearch(row, '9876543210')).toBe(true);
    expect(matchesKitchenSearch(row, '98765-43210')).toBe(true);
  });

  it('matches everything on an empty search and nothing on a miss', () => {
    expect(matchesKitchenSearch(row, '  ')).toBe(true);
    expect(matchesKitchenSearch(row, 'biryani')).toBe(false);
    expect(matchesKitchenSearch(row, '1111')).toBe(false);
  });
});
