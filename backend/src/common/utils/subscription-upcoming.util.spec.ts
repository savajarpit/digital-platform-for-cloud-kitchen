import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { buildUpcomingPreview } from './subscription-upcoming.util';
import type { ClosedDateEntry } from './closed-dates.util';

const TZ = 'Asia/Kolkata';
// Midnight IST of a date, stored the way subscriptions store startDate/cycleEnd.
const istMidnight = (date: string) => new Date(`${date}T00:00:00+05:30`);
const slot = (slotType: string, id: string) => ({
  slotType,
  meal: { id, name: `Meal ${id}`, imageUrl: null },
});

const relativePlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
  durationDays: 3,
  weekCount: null,
  scheduleAnchorDate: null,
  days: [1, 2, 3].map((dayNumber) => ({
    dayNumber,
    weekNumber: null,
    weekday: null,
    slots: [slot('LUNCH', `d${dayNumber}`)],
  })),
};

// Anchor Monday 2026-09-21; Mon–Sat deliver, Sunday has no slots.
const weeklyPlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
  durationDays: 7,
  weekCount: 1,
  scheduleAnchorDate: '2026-09-21',
  days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    dayNumber: null,
    weekNumber: 1,
    weekday,
    slots: weekday === 0 ? [] : [slot('LUNCH', `w${weekday}`)],
  })),
};

const base = {
  nextPlanDayNumber: 1,
  addressId: 'addr-1',
  deliverySlotId: null,
  usesDateSelection: false,
  scheduledDates: [] as { date: string; sequence: number }[],
  skips: [] as { dateFrom: string; dateTo: string; reason: string | null }[],
  dayOverrides: [],
};

describe('buildUpcomingPreview', () => {
  it('date selection: lists only the scheduled dates, each with its own plan day', () => {
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: relativePlan,
        usesDateSelection: true,
        startDate: istMidnight('2026-09-28'),
        cycleEnd: istMidnight('2026-10-08'),
        scheduledDates: [
          { date: '2026-09-28', sequence: 1 },
          { date: '2026-10-02', sequence: 2 },
          { date: '2026-10-08', sequence: 3 },
        ],
      },
      '2026-09-27',
      TZ,
      '2026-09-28',
      [],
    );
    expect(days.map((d) => [d.date, d.meals[0]?.mealId])).toEqual([
      ['2026-09-28', 'd1'],
      ['2026-10-02', 'd2'],
      ['2026-10-08', 'd3'],
    ]);
  });

  it('date selection: drops scheduled dates already in the past', () => {
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: relativePlan,
        usesDateSelection: true,
        startDate: istMidnight('2026-09-28'),
        cycleEnd: istMidnight('2026-10-08'),
        scheduledDates: [
          { date: '2026-09-28', sequence: 1 },
          { date: '2026-10-02', sequence: 2 },
          { date: '2026-10-08', sequence: 3 },
        ],
      },
      '2026-10-01',
      TZ,
      '2026-10-02',
      [],
    );
    expect(days.map((d) => d.date)).toEqual(['2026-10-02', '2026-10-08']);
  });

  it('weekly contiguous: an off-weekday is not listed as a delivery', () => {
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: weeklyPlan,
        startDate: istMidnight('2026-09-25'),
        cycleEnd: istMidnight('2026-09-29'),
      },
      '2026-09-24',
      TZ,
      '2026-09-25',
      [],
    );
    // Fri 25, Sat 26, (Sun 27 off), Mon 28, Tue 29
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-28',
      '2026-09-29',
    ]);
  });

  it('a holiday shows as skipped with its name and does not consume a plan day', () => {
    const holiday: ClosedDateEntry = {
      date: '2026-09-29',
      name: 'Dussehra',
      note: null,
      appliesTo: 'BOTH',
    };
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: relativePlan,
        startDate: istMidnight('2026-09-28'),
        cycleEnd: istMidnight('2026-09-30'),
      },
      '2026-09-27',
      TZ,
      '2026-09-28',
      [holiday],
    );
    expect(
      days.map((d) => [
        d.date,
        d.skipped,
        d.disruptionReason,
        d.meals[0]?.mealId,
      ]),
    ).toEqual([
      ['2026-09-28', false, null, 'd1'],
      ['2026-09-29', true, 'Holiday — Dussehra', undefined],
      ['2026-09-30', false, null, 'd2'],
    ]);
  });

  it("keeps a customer's own skip unlabelled", () => {
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: relativePlan,
        startDate: istMidnight('2026-09-28'),
        cycleEnd: istMidnight('2026-09-29'),
        skips: [{ dateFrom: '2026-09-28', dateTo: '2026-09-28', reason: null }],
      },
      '2026-09-27',
      TZ,
      '2026-09-28',
      [],
    );
    expect(days[0]).toMatchObject({ skipped: true, disruptionReason: null });
    expect(days[1].meals[0]?.mealId).toBe('d1');
  });
});

describe('buildUpcomingPreview — date selection with a skip', () => {
  it('a skipped scheduled date shifts later menus instead of losing a plan day', () => {
    const days = buildUpcomingPreview(
      {
        ...base,
        plan: relativePlan,
        usesDateSelection: true,
        startDate: istMidnight('2026-09-28'),
        cycleEnd: istMidnight('2026-10-09'),
        scheduledDates: [
          { date: '2026-09-28', sequence: 1 },
          { date: '2026-10-02', sequence: 2 },
          { date: '2026-10-08', sequence: 3 },
          // appended by banking when 10-02 was skipped
          { date: '2026-10-09', sequence: 4 },
        ],
        skips: [{ dateFrom: '2026-10-02', dateTo: '2026-10-02', reason: null }],
      },
      '2026-09-27',
      TZ,
      '2026-09-28',
      [],
    );
    expect(days.map((d) => [d.date, d.skipped, d.meals[0]?.mealId])).toEqual([
      ['2026-09-28', false, 'd1'],
      ['2026-10-02', true, undefined],
      ['2026-10-08', false, 'd2'],
      ['2026-10-09', false, 'd3'],
    ]);
  });
});
