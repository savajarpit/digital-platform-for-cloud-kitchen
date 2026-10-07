import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { buildSubscriptionCalendarDays } from './subscription-calendar.util';
import type { ClosedDateEntry } from './closed-dates.util';

const meal = (id: string) => ({ id, name: `Meal ${id}`, imageUrl: null });
const slot = (slotType: string, id: string | null) => ({
  slotType,
  meal: id ? meal(id) : null,
});

const relativeDays = [1, 2, 3].map((dayNumber) => ({
  dayNumber,
  weekNumber: null,
  weekday: null,
  slots: [slot('LUNCH', `d${dayNumber}`)],
}));

// Anchor Monday 2026-09-21; Mon–Sat deliver, Sunday has no slots (off day).
const weeklyDays = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  dayNumber: null,
  weekNumber: 1,
  weekday,
  slots: [slot('LUNCH', `w${weekday}`)],
}));
const weeklyDaysWithSunday = [
  ...weeklyDays,
  { dayNumber: null, weekNumber: 1, weekday: 0, slots: [] },
];

function baseSubscription(
  overrides: Partial<Parameters<typeof buildSubscriptionCalendarDays>[0]> = {},
) {
  return {
    addressId: 'addr1',
    deliverySlotId: 'slot1',
    usesDateSelection: false,
    skips: [],
    dayOverrides: [],
    scheduledDates: [],
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
      weekCount: null,
      scheduleAnchorDate: null,
      durationDays: 3,
      days: relativeDays,
    },
    ...overrides,
  };
}

const closure = (
  date: string,
  name: string | null = 'Founder’s Day',
  note: string | null = null,
): ClosedDateEntry => ({ date, name, note, appliesTo: 'SUBSCRIPTIONS' });

describe('buildSubscriptionCalendarDays — RELATIVE_DAY, no date selection', () => {
  it('lays Day 1..N and marks past vs future by today', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription(),
      '2026-09-20',
      '2026-09-22',
      '2026-09-21', // today
      '2026-09-21', // earliest editable
      [],
    );

    expect(days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-20', 'DELIVERED', 'Day 1'],
      ['2026-09-21', 'UPCOMING', 'Day 2'],
      ['2026-09-22', 'UPCOMING', 'Day 3'],
    ]);
  });

  it('carries meals and marks locked days before the earliest editable date', () => {
    const [day1] = buildSubscriptionCalendarDays(
      baseSubscription(),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-21',
      [],
    );
    expect(day1.locked).toBe(true);
    expect(day1.meals).toEqual([
      { slotType: 'LUNCH', mealId: 'd1', name: 'Meal d1', imageUrl: null },
    ]);
  });

  it('a plain customer skip does not advance the Day counter for later dates', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        skips: [
          {
            dateFrom: '2026-09-21',
            dateTo: '2026-09-21',
            reason: null,
            disruptionId: null,
          },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-20', 'UPCOMING', 'Day 1'],
      ['2026-09-21', 'SKIPPED', null],
      ['2026-09-22', 'UPCOMING', 'Day 2'],
    ]);
  });

  it('marks every delivery day from a pending request’s hold date ON_HOLD (locked, no meals)', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription(),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
      undefined,
      '2026-09-21', // hold from
    );
    expect(days.map((d) => [d.date, d.kind, d.locked, d.meals.length])).toEqual(
      [
        ['2026-09-20', 'UPCOMING', false, 1],
        ['2026-09-21', 'ON_HOLD', true, 0],
        ['2026-09-22', 'ON_HOLD', true, 0],
      ],
    );
  });

  it('shows a day already held for a cancellation request as ON_HOLD, never a holiday', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        skips: [
          {
            dateFrom: '2026-09-21',
            dateTo: '2026-09-21',
            reason: 'On hold — cancellation requested',
            disruptionId: null,
            cancellationRequestId: 'req1',
          },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-23',
      '2026-09-23',
      [],
    );
    expect(days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-20', 'DELIVERED', 'Day 1'],
      ['2026-09-21', 'ON_HOLD', null],
      ['2026-09-22', 'DELIVERED', 'Day 2'],
    ]);
  });

  it('a disruption-declared skip is DISRUPTED with its reason, and does not advance the counter', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        skips: [
          {
            dateFrom: '2026-09-21',
            dateTo: '2026-09-21',
            reason: 'Heavy rain',
            disruptionId: 'disr1',
          },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days[1]).toMatchObject({ kind: 'DISRUPTED', reason: 'Heavy rain' });
    expect(days[2].dayLabel).toBe('Day 2');
  });

  it('a tenant-closure skip (reason, no disruptionId) is HOLIDAY', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        skips: [
          {
            dateFrom: '2026-09-21',
            dateTo: '2026-09-21',
            reason: 'Founder’s Day',
            disruptionId: null,
          },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days[1]).toMatchObject({ kind: 'HOLIDAY', reason: 'Founder’s Day' });
  });

  it('a future closure not yet processed by the cron shows as HOLIDAY in advance', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription(),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [closure('2026-09-21')],
    );
    expect(days[1]).toMatchObject({ kind: 'HOLIDAY', reason: 'Founder’s Day' });
    // The counter is not spent on a not-yet-processed closure.
    expect(days[2].dayLabel).toBe('Day 2');
  });

  it('a past closed date that was never skipped is just DELIVERED (already happened)', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription(),
      '2026-09-20',
      '2026-09-22',
      '2026-09-22',
      '2026-09-19',
      [closure('2026-09-20')],
    );
    expect(days[0].kind).toBe('DELIVERED');
  });

  it('an override changes the address/slot/note for just that day', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        dayOverrides: [
          {
            date: '2026-09-21',
            addressId: 'addr2',
            deliverySlotId: null,
            note: 'Leave at gate',
          },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days[1]).toMatchObject({
      addressId: 'addr2',
      // A null override deliverySlotId means "no override for the slot",
      // same convention buildUpcomingPreview already uses — falls back to
      // the subscription's own default, not cleared to null.
      deliverySlotId: 'slot1',
      isOverridden: true,
      note: 'Leave at gate',
    });
    expect(days[0]).toMatchObject({
      addressId: 'addr1',
      deliverySlotId: 'slot1',
      isOverridden: false,
    });
  });
});

describe('buildSubscriptionCalendarDays — WEEKLY_FIXED, no date selection', () => {
  const weeklyPlan = {
    schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
    weekCount: 1,
    scheduleAnchorDate: '2026-09-21',
    durationDays: 6,
    days: weeklyDaysWithSunday,
  };

  it('marks the off-weekday OFF_DAY with no dayLabel, and resolves that weekday’s own menu', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({ plan: weeklyPlan }),
      '2026-09-21', // Monday
      '2026-09-27', // Sunday
      '2026-09-30',
      '2026-09-20',
      [],
    );
    expect(days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-21', 'DELIVERED', null],
      ['2026-09-22', 'DELIVERED', null],
      ['2026-09-23', 'DELIVERED', null],
      ['2026-09-24', 'DELIVERED', null],
      ['2026-09-25', 'DELIVERED', null],
      ['2026-09-26', 'DELIVERED', null],
      ['2026-09-27', 'OFF_DAY', null],
    ]);
    expect(days[0].meals).toEqual([
      { slotType: 'LUNCH', mealId: 'w1', name: 'Meal w1', imageUrl: null },
    ]);
  });

  it('OFF_DAY wins over a stray skip on that same off day', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        plan: weeklyPlan,
        skips: [
          {
            dateFrom: '2026-09-27',
            dateTo: '2026-09-27',
            reason: null,
            disruptionId: null,
          },
        ],
      }),
      '2026-09-21',
      '2026-09-27',
      '2026-09-30',
      '2026-09-20',
      [],
    );
    expect(days.at(-1)?.kind).toBe('OFF_DAY');
  });
});

describe('buildSubscriptionCalendarDays — usesDateSelection', () => {
  it('a date with no scheduled row is NOT_SCHEDULED, even if it would otherwise deliver', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        usesDateSelection: true,
        scheduledDates: [
          { date: '2026-09-20', sequence: 1 },
          { date: '2026-09-22', sequence: 2 },
        ],
      }),
      '2026-09-20',
      '2026-09-22',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-20', 'UPCOMING'],
      ['2026-09-21', 'NOT_SCHEDULED'],
      ['2026-09-22', 'UPCOMING'],
    ]);
  });

  it('uses the scheduled row’s own sequence for the Day label, not a running counter', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        usesDateSelection: true,
        scheduledDates: [
          { date: '2026-09-20', sequence: 1 },
          { date: '2026-09-25', sequence: 2 },
        ],
      }),
      '2026-09-20',
      '2026-09-25',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days.find((d) => d.date === '2026-09-25')?.dayLabel).toBe('Day 2');
  });

  it('NOT_SCHEDULED beats a disruption/holiday on the same date', () => {
    const days = buildSubscriptionCalendarDays(
      baseSubscription({
        usesDateSelection: true,
        scheduledDates: [{ date: '2026-09-20', sequence: 1 }],
        skips: [
          {
            dateFrom: '2026-09-21',
            dateTo: '2026-09-21',
            reason: 'Rain',
            disruptionId: 'd1',
          },
        ],
      }),
      '2026-09-20',
      '2026-09-21',
      '2026-09-19',
      '2026-09-19',
      [],
    );
    expect(days[1].kind).toBe('NOT_SCHEDULED');
  });
});
