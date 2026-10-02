import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import {
  buildPlanCalendar,
  buildWeeklyMealsByDate,
} from './plan-calendar.util';
import type { ClosedDateEntry } from './closed-dates.util';

const meal = (id: string) => ({ id, name: `Meal ${id}`, imageUrl: null });
const slot = (slotType: string, id: string | null) => ({
  slotType,
  meal: id ? meal(id) : null,
});

// Anchor Monday 2026-09-21, one authored week: Mon–Sat deliver, Sunday has
// no slots at all (off day).
const weeklyDays = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  dayNumber: null,
  weekNumber: 1,
  weekday,
  slots: [slot('LUNCH', `w${weekday}`)],
}));
const weeklyPlan = (
  offDayHandling: SubscriptionOffDayHandling,
  durationDays: number,
) => ({
  schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
  durationDays,
  weekCount: 1,
  scheduleAnchorDate: '2026-09-21',
  offDayHandling,
  days: [
    ...weeklyDays,
    { dayNumber: null, weekNumber: 1, weekday: 0, slots: [] },
  ],
});

const relativePlan = (durationDays: number) => ({
  schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
  durationDays,
  weekCount: null,
  scheduleAnchorDate: null,
  offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
  days: [1, 2, 3].map((dayNumber) => ({
    dayNumber,
    weekNumber: null,
    weekday: null,
    slots: [slot('LUNCH', `d${dayNumber}`), slot('DINNER', null)],
  })),
});

const closure = (
  date: string,
  name: string | null = 'Founder’s Day',
  note: string | null = 'Back tomorrow',
): ClosedDateEntry => ({ date, name, note, appliesTo: 'SUBSCRIPTIONS' });

describe('buildPlanCalendar — RELATIVE_DAY', () => {
  it('lays Day 1..N over consecutive dates', () => {
    const cal = buildPlanCalendar(relativePlan(3), '2026-09-22', []);

    expect(cal.startDate).toBe('2026-09-22');
    expect(cal.endDate).toBe('2026-09-24');
    expect(cal.days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-22', 'DELIVERY', 'Day 1'],
      ['2026-09-23', 'DELIVERY', 'Day 2'],
      ['2026-09-24', 'DELIVERY', 'Day 3'],
    ]);
  });

  it('carries meals, with a TBD slot as a null name', () => {
    const [day1] = buildPlanCalendar(relativePlan(3), '2026-09-22', []).days;

    expect(day1.meals).toEqual([
      { slotType: 'LUNCH', mealId: 'd1', name: 'Meal d1', imageUrl: null },
      { slotType: 'DINNER', mealId: null, name: null, imageUrl: null },
    ]);
  });

  it('a holiday is not a delivery day and pushes the whole plan out', () => {
    const cal = buildPlanCalendar(relativePlan(3), '2026-09-22', [
      closure('2026-09-23'),
    ]);

    expect(cal.days.map((d) => [d.date, d.kind, d.dayLabel])).toEqual([
      ['2026-09-22', 'DELIVERY', 'Day 1'],
      ['2026-09-23', 'HOLIDAY', null],
      ['2026-09-24', 'DELIVERY', 'Day 2'],
      ['2026-09-25', 'DELIVERY', 'Day 3'],
    ]);
    expect(cal.endDate).toBe('2026-09-25');
  });

  it('exposes the holiday name and note and no meals', () => {
    const cal = buildPlanCalendar(relativePlan(3), '2026-09-22', [
      closure('2026-09-22'),
    ]);

    expect(cal.days[0]).toMatchObject({
      kind: 'HOLIDAY',
      holiday: { name: 'Founder’s Day', note: 'Back tomorrow' },
      meals: [],
    });
  });
});

describe('buildPlanCalendar — WEEKLY_FIXED', () => {
  it("a closure on the plan's own off weekday stays OFF_DAY and adds no day", () => {
    // Sun 27 Sep is both the plan's off day and a kitchen weekly off.
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE, 3),
      '2026-09-26',
      [closure('2026-09-27', 'Weekly off', null)],
    );

    expect(cal.days.map((d) => [d.date, d.kind, d.holiday])).toEqual([
      ['2026-09-26', 'DELIVERY', null],
      ['2026-09-27', 'OFF_DAY', null],
      ['2026-09-28', 'DELIVERY', null],
      ['2026-09-29', 'DELIVERY', null],
    ]);
  });

  it('EXTEND_TO_COMPENSATE runs until N real deliveries, skipping the off day', () => {
    // Sat 26 Sep start, 3 deliveries: Sat, (Sun off), Mon, Tue
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE, 3),
      '2026-09-26',
      [],
    );

    expect(cal.days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-26', 'DELIVERY'],
      ['2026-09-27', 'OFF_DAY'],
      ['2026-09-28', 'DELIVERY'],
      ['2026-09-29', 'DELIVERY'],
    ]);
    expect(cal.endDate).toBe('2026-09-29');
  });

  it('LOSS_DELIVERY keeps a flat span — the off day eats into the duration', () => {
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.LOSS_DELIVERY, 3),
      '2026-09-26',
      [],
    );

    expect(cal.days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-26', 'DELIVERY'],
      ['2026-09-27', 'OFF_DAY'],
      ['2026-09-28', 'DELIVERY'],
    ]);
  });

  it('a date gets that weekday’s menu, with no Day label', () => {
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.LOSS_DELIVERY, 2),
      '2026-09-22', // Tuesday
      [],
    );

    expect(cal.days[0].dayLabel).toBeNull();
    expect(cal.days[0].meals[0]).toMatchObject({ mealId: 'w2' });
    expect(cal.days[1].meals[0]).toMatchObject({ mealId: 'w3' });
  });

  it('an off day wins over a holiday on the same date (nothing was due)', () => {
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE, 2),
      '2026-09-26',
      [closure('2026-09-27')], // the off Sunday is also a holiday
    );

    expect(cal.days[1]).toMatchObject({
      date: '2026-09-27',
      kind: 'OFF_DAY',
      holiday: null,
    });
  });

  it('EXTEND: a holiday is not a delivery, so the span runs one day longer', () => {
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE, 3),
      '2026-09-21', // Monday
      [closure('2026-09-22')],
    );

    expect(cal.days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-21', 'DELIVERY'],
      ['2026-09-22', 'HOLIDAY'],
      ['2026-09-23', 'DELIVERY'],
      ['2026-09-24', 'DELIVERY'],
    ]);
  });

  it('LOSS: a holiday inside the span is lost, not compensated', () => {
    const cal = buildPlanCalendar(
      weeklyPlan(SubscriptionOffDayHandling.LOSS_DELIVERY, 3),
      '2026-09-21',
      [closure('2026-09-22')],
    );

    expect(cal.days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-21', 'DELIVERY'],
      ['2026-09-22', 'HOLIDAY'],
      ['2026-09-23', 'DELIVERY'],
    ]);
  });

  it('returns an empty calendar when the plan has no delivery weekday', () => {
    const plan = weeklyPlan(SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE, 3);
    plan.days = plan.days.map((d) => ({ ...d, slots: [] }));

    expect(buildPlanCalendar(plan, '2026-09-22', []).days).toEqual([]);
  });
});

describe('buildWeeklyMealsByDate', () => {
  it("resolves each date's menu from its own weekday, independent of the other dates", () => {
    const plan = weeklyPlan(SubscriptionOffDayHandling.LOSS_DELIVERY, 7);

    // Tue 22, Fri 25, Tue 29 (next week, same authored weekday as the 22nd).
    expect(
      buildWeeklyMealsByDate(plan, ['2026-09-22', '2026-09-25', '2026-09-29']),
    ).toEqual({
      '2026-09-22': [
        { slotType: 'LUNCH', mealId: 'w2', name: 'Meal w2', imageUrl: null },
      ],
      '2026-09-25': [
        { slotType: 'LUNCH', mealId: 'w5', name: 'Meal w5', imageUrl: null },
      ],
      '2026-09-29': [
        { slotType: 'LUNCH', mealId: 'w2', name: 'Meal w2', imageUrl: null },
      ],
    });
  });

  it('keeps a TBD slot as a null name and an off-day as an empty list', () => {
    const plan = weeklyPlan(SubscriptionOffDayHandling.LOSS_DELIVERY, 7);
    plan.days[0] = { ...plan.days[0], slots: [slot('LUNCH', null)] };

    const result = buildWeeklyMealsByDate(plan, ['2026-09-21', '2026-09-27']);

    expect(result['2026-09-21']).toEqual([
      { slotType: 'LUNCH', mealId: null, name: null, imageUrl: null },
    ]);
    expect(result['2026-09-27']).toEqual([]);
  });
});
