import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import { projectHolidayReplacements } from './subscription-holiday-projection.util';
import { buildSubscriptionCalendarDays } from './subscription-calendar.util';
import { buildUpcomingPreview } from './subscription-upcoming.util';
import type { ClosedDateEntry } from './closed-dates.util';

const holiday = (date: string, name = 'Diwali'): ClosedDateEntry => ({
  date,
  name,
  note: null,
  appliesTo: 'SUBSCRIPTIONS',
});

const relativeDays = [1, 2, 3].map((dayNumber) => ({
  dayNumber,
  weekNumber: null,
  weekday: null,
  slots: [
    {
      slotType: 'LUNCH',
      meal: { id: `d${dayNumber}`, name: `Meal ${dayNumber}`, imageUrl: null },
    },
  ],
}));

// Anchor Monday 2026-09-21; Mon–Sat deliver, Sunday has no slots.
const weeklyDays = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  dayNumber: null,
  weekNumber: 1,
  weekday,
  slots:
    weekday === 0
      ? []
      : [
          {
            slotType: 'LUNCH',
            meal: { id: `w${weekday}`, name: 'W', imageUrl: null },
          },
        ],
}));

function sub(
  overrides: Partial<{
    usesDateSelection: boolean;
    skips: {
      dateFrom: string;
      dateTo: string;
      reason: string | null;
      disruptionId: string | null;
    }[];
    scheduledDates: { date: string; sequence: number }[];
    plan: Record<string, unknown>;
  }> = {},
) {
  const { plan, ...rest } = overrides;
  return {
    addressId: 'addr1',
    deliverySlotId: null,
    nextPlanDayNumber: 1,
    startDate: new Date('2026-09-21T00:00:00.000Z'),
    cycleEnd: new Date('2026-09-30T00:00:00.000Z'),
    usesDateSelection: false,
    skips: [],
    dayOverrides: [],
    scheduledDates: [],
    ...rest,
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
      offDayHandling: SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE,
      durationDays: 3,
      weekCount: null,
      scheduleAnchorDate: null,
      days: relativeDays,
      ...plan,
    },
  } as never;
}

describe('projectHolidayReplacements', () => {
  it('projects one replacement day after cycleEnd per upcoming holiday', () => {
    const p = projectHolidayReplacements(
      sub(),
      '2026-09-22',
      '2026-09-21',
      '2026-09-30',
      [holiday('2026-09-25'), holiday('2026-09-27')],
    );
    expect(p.projectedDates).toEqual(['2026-10-01', '2026-10-02']);
    expect(p.replacementByHoliday.get('2026-09-25')).toBe('2026-10-01');
    expect(p.replacementByHoliday.get('2026-09-27')).toBe('2026-10-02');
  });

  it('skips a replacement over another (later) holiday', () => {
    const p = projectHolidayReplacements(
      sub(),
      '2026-09-22',
      '2026-09-21',
      '2026-09-30',
      [holiday('2026-09-25'), holiday('2026-10-01', 'Gandhi Jayanti')],
    );
    expect(p.projectedDates).toEqual(['2026-10-02']);
  });

  it('ignores past holidays, holidays outside the plan and ones already skipped', () => {
    const p = projectHolidayReplacements(
      sub({
        skips: [
          {
            dateFrom: '2026-09-26',
            dateTo: '2026-09-26',
            reason: null,
            disruptionId: null,
          },
        ],
      }),
      '2026-09-22',
      '2026-09-21',
      '2026-09-30',
      [holiday('2026-09-21'), holiday('2026-09-26'), holiday('2026-10-05')],
    );
    expect(p.projectedDates).toEqual([]);
  });

  it('date selection: only a holiday on a chosen date is replaced', () => {
    const p = projectHolidayReplacements(
      sub({
        usesDateSelection: true,
        scheduledDates: [
          { date: '2026-09-23', sequence: 1 },
          { date: '2026-09-30', sequence: 2 },
        ],
      }),
      '2026-09-22',
      '2026-09-21',
      '2026-09-30',
      [holiday('2026-09-23'), holiday('2026-09-24')],
    );
    expect(p.projectedDates).toEqual(['2026-10-01']);
    expect([...p.replacementByHoliday.keys()]).toEqual(['2026-09-23']);
  });

  it('weekly: lands on the next delivery weekday, never on an off day', () => {
    const p = projectHolidayReplacements(
      sub({
        plan: {
          schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
          weekCount: 1,
          scheduleAnchorDate: '2026-09-21',
          days: weeklyDays,
        },
      }),
      '2026-09-22',
      '2026-09-21',
      '2026-10-03', // Saturday
      [holiday('2026-09-24'), holiday('2026-09-27')], // Thu, Sun (off day)
    );
    // Sun Oct 4 is an off day → Mon Oct 5. The Sunday holiday was never a delivery.
    expect(p.projectedDates).toEqual(['2026-10-05']);
  });

  it('weekly without compensation projects nothing', () => {
    const p = projectHolidayReplacements(
      sub({
        plan: {
          schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
          offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
          weekCount: 1,
          scheduleAnchorDate: '2026-09-21',
          days: weeklyDays,
        },
      }),
      '2026-09-22',
      '2026-09-21',
      '2026-10-03',
      [holiday('2026-09-24')],
    );
    expect(p.projectedDates).toEqual([]);
  });
});

describe('holiday projection on the calendar and upcoming list', () => {
  const closures = [holiday('2026-09-29')];
  const subscription = sub();
  const projection = projectHolidayReplacements(
    subscription,
    '2026-09-28',
    '2026-09-21',
    '2026-09-30',
    closures,
  );

  it('calendar: the holiday names its replacement and the extra day is PROJECTED', () => {
    const days = buildSubscriptionCalendarDays(
      subscription,
      '2026-09-21',
      '2026-09-30',
      '2026-09-28',
      '2026-09-28',
      closures,
      projection,
    );
    const byDate = new Map(days.map((d) => [d.date, d]));
    expect(byDate.get('2026-09-29')).toMatchObject({
      kind: 'HOLIDAY',
      replacementDate: '2026-10-01',
    });
    expect(byDate.get('2026-10-01')).toMatchObject({
      kind: 'PROJECTED',
      locked: true,
      replacementDate: null,
    });
    // Day 1..3 cycle: 9 delivered days (21..28, 30) put Oct 1 on Day 1 again.
    expect(byDate.get('2026-10-01')?.dayLabel).toBe('Day 1');
    expect(days.at(-1)?.date).toBe('2026-10-01');
  });

  it('calendar without a projection is unchanged', () => {
    const days = buildSubscriptionCalendarDays(
      subscription,
      '2026-09-21',
      '2026-09-30',
      '2026-09-28',
      '2026-09-28',
      closures,
    );
    expect(days.at(-1)?.date).toBe('2026-09-30');
    expect(
      days.find((d) => d.date === '2026-09-29')?.replacementDate,
    ).toBeNull();
  });

  it('upcoming: the holiday row carries its replacement date', () => {
    const upcoming = buildUpcomingPreview(
      subscription,
      '2026-09-28',
      'UTC',
      '2026-09-28',
      closures,
      projection,
    );
    expect(upcoming.find((d) => d.date === '2026-09-29')).toMatchObject({
      skipped: true,
      disruptionReason: 'Holiday — Diwali',
      replacementDate: '2026-10-01',
      isHoliday: true,
    });
    expect(
      upcoming.find((d) => d.date === '2026-09-28')?.replacementDate,
    ).toBeNull();
  });
});
