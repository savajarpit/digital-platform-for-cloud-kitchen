import { planDeliveryOf } from './plan-delivery.util';

describe('planDeliveryOf', () => {
  it('is null for a normal order', () => {
    expect(
      planDeliveryOf({ subscriptionId: null, notes: 'No onions' }),
    ).toBeNull();
  });

  it('reads the plan name and day of a plan delivery', () => {
    expect(
      planDeliveryOf({
        subscriptionId: 's1',
        notes: 'Subscription: 7-day plan — Day 3',
      }),
    ).toEqual({
      subscriptionId: 's1',
      planName: '7-day plan',
      dayLabel: 'Day 3',
      customerNote: null,
    });
  });

  it("separates the customer's own note (weekly plan label)", () => {
    expect(
      planDeliveryOf({
        subscriptionId: 's1',
        notes: 'Subscription: Fit — Week 2 · Mon — Note: Ring the bell',
      }),
    ).toMatchObject({
      dayLabel: 'Week 2 · Mon',
      customerNote: 'Ring the bell',
    });
  });

  it('falls back safely on an unexpected label', () => {
    expect(planDeliveryOf({ subscriptionId: 's1', notes: null })).toMatchObject(
      { planName: 'Meal plan', dayLabel: '', customerNote: null },
    );
  });
});
