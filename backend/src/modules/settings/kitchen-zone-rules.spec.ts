import { kitchenZoneInUseMessage } from './kitchen-zone-rules';

describe('kitchenZoneInUseMessage', () => {
  it('is null for an unused zone', () => {
    expect(
      kitchenZoneInUseMessage({ tables: 0, waitlist: 0, orders: 0 }),
    ).toBeNull();
  });

  it('lists what still references the zone', () => {
    expect(kitchenZoneInUseMessage({ tables: 1, waitlist: 2, orders: 3 })).toBe(
      'This outlet still has 1 dining table, 2 waitlist entries and 3 pickup or dine-in orders. Switch it off instead — it stops serving new addresses, and its history stays intact.',
    );
  });
});
