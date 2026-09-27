import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import {
  MAX_SELECTION_WINDOW_DAYS,
  computeCandidateDeliveryDates,
  computeSelectionWindow,
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

type Closure = { name: string | null; note: string | null };
const NO_CLOSURES = new Map<string, Closure>();

describe('computeSelectionWindow', () => {
  it('RELATIVE_DAY: duration + flexibility consecutive days, nothing unavailable', () => {
    const w = computeSelectionWindow(
      relativePlan,
      null,
      '2026-09-22',
      7,
      2,
      NO_CLOSURES,
    );
    expect(w.candidates).toEqual([
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
    expect(w.unavailable).toEqual([]);
  });

  it('a holiday does not eat into the count — the window walks one day further', () => {
    const diwali = new Map<string, Closure>([
      ['2026-09-23', { name: 'Diwali', note: 'Back on Thursday' }],
    ]);
    const w = computeSelectionWindow(
      relativePlan,
      null,
      '2026-09-22',
      3,
      0,
      diwali,
    );
    expect(w.candidates).toEqual(['2026-09-22', '2026-09-24', '2026-09-25']);
    expect(w.unavailable).toEqual([
      {
        date: '2026-09-23',
        kind: 'HOLIDAY',
        holiday: { name: 'Diwali', note: 'Back on Thursday' },
      },
    ]);
  });

  it('WEEKLY_FIXED: 7 required + 7 flexibility = 14 real delivery days, Sundays skipped', () => {
    const w = computeSelectionWindow(
      weeklyPlan,
      MON_TO_SAT,
      '2026-09-21',
      7,
      7,
      NO_CLOSURES,
    );
    expect(w.candidates).toHaveLength(14);
    expect(w.candidates.at(-1)).toBe('2026-10-06');
    expect(w.unavailable.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-27', 'OFF_DAY'],
      ['2026-10-04', 'OFF_DAY'],
    ]);
  });

  it('a closure on an off-weekday shows as the holiday', () => {
    const w = computeSelectionWindow(
      weeklyPlan,
      MON_TO_SAT,
      '2026-09-21',
      7,
      0,
      new Map<string, Closure>([['2026-09-27', { name: null, note: null }]]),
    );
    expect(w.unavailable.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-27', 'HOLIDAY'],
    ]);
  });

  it('stops at MAX_SELECTION_WINDOW_DAYS calendar days', () => {
    const w = computeSelectionWindow(
      relativePlan,
      null,
      '2026-01-01',
      100,
      100,
      NO_CLOSURES,
    );
    expect(w.candidates).toHaveLength(MAX_SELECTION_WINDOW_DAYS);
  });

  it('a WEEKLY_FIXED plan with no delivery weekday yields no candidates', () => {
    const w = computeSelectionWindow(
      weeklyPlan,
      new Set(),
      '2026-09-21',
      6,
      0,
      NO_CLOSURES,
    );
    expect(w.candidates).toEqual([]);
  });
});

describe('computeCandidateDeliveryDates', () => {
  it('matches the window candidates, treating each closed date as a holiday', () => {
    expect(
      computeCandidateDeliveryDates(
        relativePlan,
        null,
        '2026-09-22',
        3,
        0,
        new Set(['2026-09-23']),
      ),
    ).toEqual(['2026-09-22', '2026-09-24', '2026-09-25']);
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
