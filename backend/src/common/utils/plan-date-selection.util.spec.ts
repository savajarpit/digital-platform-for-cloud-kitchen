import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import {
  MAX_SELECTION_WINDOW_DAYS,
  computeCandidateDeliveryDates,
  computeUnavailableDates,
  isManualSelectionPlan,
  validateSelectedDates,
} from './plan-date-selection.util';

const relativePlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
  weekCount: null,
  scheduleAnchorDate: null,
  durationDays: 7,
};

// Anchor Monday 2026-09-21; Mon–Sat deliver, Sunday is an off day.
const weeklyPlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
  weekCount: 1,
  scheduleAnchorDate: '2026-09-21',
  durationDays: 6,
};
const MON_TO_SAT = new Set(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']);

describe('computeCandidateDeliveryDates', () => {
  it('RELATIVE_DAY: every day in the window is a candidate', () => {
    const dates = computeCandidateDeliveryDates(
      relativePlan,
      null,
      '2026-09-22',
      7,
      2,
      new Set(),
    );
    expect(dates).toEqual([
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
    ]);
  });

  it('RELATIVE_DAY: a closed date is excluded from the candidates', () => {
    const dates = computeCandidateDeliveryDates(
      relativePlan,
      null,
      '2026-09-22',
      3,
      0,
      new Set(['2026-09-23']),
    );
    expect(dates).toEqual(['2026-09-22', '2026-09-24']);
  });

  it('WEEKLY_FIXED: excludes the off-weekday', () => {
    const dates = computeCandidateDeliveryDates(
      weeklyPlan,
      MON_TO_SAT,
      '2026-09-21',
      7,
      0,
      new Set(),
    );
    expect(dates).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
    ]);
  });

  it('window = duration + flexibility, capped at MAX_SELECTION_WINDOW_DAYS', () => {
    const dates = computeCandidateDeliveryDates(
      relativePlan,
      null,
      '2026-01-01',
      100,
      100,
      new Set(),
    );
    expect(dates).toHaveLength(MAX_SELECTION_WINDOW_DAYS);
  });

  it('a WEEKLY_FIXED plan with no delivery weekday yields no candidates', () => {
    const dates = computeCandidateDeliveryDates(
      weeklyPlan,
      new Set(),
      '2026-09-21',
      6,
      0,
      new Set(),
    );
    expect(dates).toEqual([]);
  });
});

describe('isManualSelectionPlan', () => {
  it('is manual at 7 days and shorter', () => {
    expect(isManualSelectionPlan(1)).toBe(true);
    expect(isManualSelectionPlan(7)).toBe(true);
  });

  it('is not manual past 7 days', () => {
    expect(isManualSelectionPlan(8)).toBe(false);
    expect(isManualSelectionPlan(30)).toBe(false);
  });
});

describe('validateSelectedDates', () => {
  const candidates = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];

  it('accepts a valid selection and sorts it ascending', () => {
    const result = validateSelectedDates(
      ['2026-09-24', '2026-09-22', '2026-09-23'],
      candidates,
      3,
    );
    expect(result).toEqual({
      ok: true,
      dates: ['2026-09-22', '2026-09-23', '2026-09-24'],
    });
  });

  it('rejects a duplicate date', () => {
    const result = validateSelectedDates(
      ['2026-09-22', '2026-09-22'],
      candidates,
      2,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('repeat');
  });

  it('rejects the wrong count', () => {
    const result = validateSelectedDates(['2026-09-22'], candidates, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('exactly 3');
  });

  it('rejects a date outside the candidate window', () => {
    const result = validateSelectedDates(
      ['2026-09-22', '2026-10-01'],
      candidates,
      2,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('2026-10-01');
  });
});

describe('computeUnavailableDates', () => {
  type Closure = { name: string | null; note: string | null };
  const diwali = new Map<string, Closure>([
    ['2026-09-23', { name: 'Diwali', note: 'Back on Thursday' }],
  ]);

  it('RELATIVE_DAY: only closures are unavailable, with their name and note', () => {
    expect(
      computeUnavailableDates(relativePlan, null, '2026-09-22', 3, 0, diwali),
    ).toEqual([
      {
        date: '2026-09-23',
        kind: 'HOLIDAY',
        holiday: { name: 'Diwali', note: 'Back on Thursday' },
      },
    ]);
  });

  it('WEEKLY_FIXED: marks the off-weekday and closures, a closure winning over an off-day', () => {
    const closures = new Map<string, Closure>([
      ...diwali,
      ['2026-09-27', { name: null, note: null }],
    ]);
    expect(
      computeUnavailableDates(
        weeklyPlan,
        MON_TO_SAT,
        '2026-09-21',
        14,
        0,
        closures,
      ).map((d) => [d.date, d.kind]),
    ).toEqual([
      ['2026-09-23', 'HOLIDAY'],
      ['2026-09-27', 'HOLIDAY'],
      ['2026-10-04', 'OFF_DAY'],
    ]);
  });

  it('is exactly the complement of the candidates over the window', () => {
    const args = [weeklyPlan, MON_TO_SAT, '2026-09-21', 10, 4] as const;
    const candidates = computeCandidateDeliveryDates(
      ...args,
      new Set(diwali.keys()),
    );
    const unavailable = computeUnavailableDates(...args, diwali).map(
      (d) => d.date,
    );
    expect([...candidates, ...unavailable].sort()).toHaveLength(14);
    expect(candidates.filter((d) => unavailable.includes(d))).toEqual([]);
  });
});
