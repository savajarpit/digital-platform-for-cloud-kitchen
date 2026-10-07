import {
  type DeliveryCalendar,
  MAX_PAUSE_DAYS,
  pausedDeliveryDays,
  pauseRangeError,
  skipDateError,
  skippedDateSet,
} from './subscription-day-rules';

// Plan delivers 3–9 Oct, except Wednesdays (an off weekday); 6 Oct is a
// kitchen holiday and 4 Oct is already skipped.
const calendar: DeliveryCalendar = {
  startStr: '2026-10-03',
  cycleEndStr: '2026-10-09',
  isPlanDay: (d) => d !== '2026-10-07',
  closed: new Set(['2026-10-06']),
  skipped: new Set(['2026-10-04']),
  heldFrom: null,
};

describe('skipDateError', () => {
  it('allows a real, not-yet-skipped delivery day', () => {
    expect(skipDateError(calendar, '2026-10-05')).toBeNull();
  });

  it.each([
    ['2026-11-20', "That day isn't part of this plan."],
    ['2026-10-02', "That day isn't part of this plan."],
    ['2026-10-07', "There's no delivery on that day in this plan."],
    ['2026-10-04', 'That day is already skipped.'],
    [
      '2026-10-06',
      'The kitchen is closed on that date, so there is no delivery to skip.',
    ],
  ])('rejects %s', (date, message) => {
    expect(skipDateError(calendar, date)).toBe(message);
  });
});

describe('pausedDeliveryDays', () => {
  it('counts only real, open, unskipped plan days inside the plan', () => {
    // 3 (yes) 4 (skipped) 5 (yes) 6 (closed) 7 (off) 8 9 (yes) 10–12 (past end)
    expect(pausedDeliveryDays(calendar, '2026-10-03', '2026-10-12')).toEqual([
      '2026-10-03',
      '2026-10-05',
      '2026-10-08',
      '2026-10-09',
    ]);
  });
});

describe('pauseRangeError', () => {
  it('allows a pause that starts inside the plan, even running past its end', () => {
    expect(pauseRangeError(calendar, '2026-10-08', '2026-10-12')).toBeNull();
  });

  it('rejects a reversed range', () => {
    expect(pauseRangeError(calendar, '2026-10-08', '2026-10-05')).toBe(
      'The pause has to end on or after its start.',
    );
  });

  it(`caps a pause at ${MAX_PAUSE_DAYS} days`, () => {
    expect(pauseRangeError(calendar, '2026-10-03', '2026-11-01')).toBeNull();
    expect(pauseRangeError(calendar, '2026-10-03', '2026-11-02')).toBe(
      `A pause can be at most ${MAX_PAUSE_DAYS} days.`,
    );
  });

  it('rejects a pause starting outside the plan', () => {
    expect(pauseRangeError(calendar, '2026-12-01', '2026-12-10')).toBe(
      'A pause has to start on a day within the plan.',
    );
  });

  it('rejects a pause that stops no delivery', () => {
    expect(pauseRangeError(calendar, '2026-10-06', '2026-10-07')).toBe(
      'There are no deliveries to pause on those dates.',
    );
  });
});

describe('pending cancellation hold', () => {
  const held = { ...calendar, heldFrom: '2026-10-08' };

  it('blocks skipping or pausing into held days, but not before them', () => {
    expect(skipDateError(held, '2026-10-05')).toBeNull();
    expect(skipDateError(held, '2026-10-08')).toContain('on hold');
    expect(pauseRangeError(held, '2026-10-03', '2026-10-05')).toBeNull();
    expect(pauseRangeError(held, '2026-10-05', '2026-10-08')).toContain(
      'on hold',
    );
  });
});

describe('skippedDateSet', () => {
  it('expands ranges and ignores malformed stored dates', () => {
    const set = skippedDateSet([
      { dateFrom: '2026-10-04', dateTo: '2026-10-05' },
      { dateFrom: '2026-10-06T00:00:00Z', dateTo: '2026-10-06T00:00:00Z' },
    ]);
    expect([...set]).toEqual(['2026-10-04', '2026-10-05']);
  });
});
