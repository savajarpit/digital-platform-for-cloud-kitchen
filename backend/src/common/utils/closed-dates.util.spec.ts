import {
  closedDatesAffecting,
  normalizeClosedDates,
  subscriptionClosedDateSet,
  weeklyOffWeekdays,
  withWeeklyOffClosures,
} from './closed-dates.util';

const OPEN = { open: '09:00', close: '21:00' };
// Sunday off; Saturday has an open time but no close — also off.
const HOURS = {
  mon: OPEN,
  tue: OPEN,
  wed: OPEN,
  thu: OPEN,
  fri: OPEN,
  sat: { open: '09:00' },
  sun: {},
};

describe('weeklyOffWeekdays', () => {
  it('returns weekdays with no complete hours (0=Sun)', () => {
    expect([...weeklyOffWeekdays(HOURS)].sort()).toEqual([0, 6]);
  });

  it('treats no configured hours as open every day', () => {
    expect(weeklyOffWeekdays({}).size).toBe(0);
    expect(weeklyOffWeekdays(null).size).toBe(0);
  });
});

describe('withWeeklyOffClosures', () => {
  // 2026-10-03 is a Saturday, 2026-10-04 a Sunday.
  it('adds a SUBSCRIPTIONS "Weekly off" closure for each off date in range', () => {
    const result = withWeeklyOffClosures([], HOURS, '2026-10-01', '2026-10-07');
    expect(result).toEqual([
      {
        date: '2026-10-03',
        name: 'Weekly off',
        note: null,
        appliesTo: 'SUBSCRIPTIONS',
      },
      {
        date: '2026-10-04',
        name: 'Weekly off',
        note: null,
        appliesTo: 'SUBSCRIPTIONS',
      },
    ]);
    expect(subscriptionClosedDateSet(result).has('2026-10-04')).toBe(true);
  });

  it('keeps an explicit holiday on the same date instead of duplicating it', () => {
    const diwali = {
      date: '2026-10-04',
      name: 'Diwali',
      note: null,
      appliesTo: 'ORDERS' as const,
    };
    const result = withWeeklyOffClosures(
      [diwali],
      HOURS,
      '2026-10-04',
      '2026-10-04',
    );
    expect(result).toEqual([diwali]);
  });

  it('returns the entries untouched when no day is off', () => {
    const entries = [
      {
        date: '2026-10-04',
        name: null,
        note: null,
        appliesTo: 'BOTH' as const,
      },
    ];
    expect(withWeeklyOffClosures(entries, {}, '2026-10-01', '2026-10-31')).toBe(
      entries,
    );
  });
});

describe('normalizeClosedDates', () => {
  it('returns [] for non-array input', () => {
    expect(normalizeClosedDates(null)).toEqual([]);
    expect(normalizeClosedDates(undefined)).toEqual([]);
    expect(normalizeClosedDates({ date: '2026-12-25' })).toEqual([]);
  });

  it('maps a legacy bare date string to an ORDERS-only entry', () => {
    // Legacy dates only ever closed one-off orders — they must not start
    // blocking subscription deliveries the tenant never intended to close.
    expect(normalizeClosedDates(['2026-12-25'])).toEqual([
      { date: '2026-12-25', name: null, note: null, appliesTo: 'ORDERS' },
    ]);
  });

  it('keeps name, note and appliesTo on the current object shape', () => {
    expect(
      normalizeClosedDates([
        {
          date: '2026-11-08',
          name: 'Diwali',
          note: 'Closed for the festival',
          appliesTo: 'BOTH',
        },
      ]),
    ).toEqual([
      {
        date: '2026-11-08',
        name: 'Diwali',
        note: 'Closed for the festival',
        appliesTo: 'BOTH',
      },
    ]);
  });

  it('defaults an unknown or missing appliesTo to ORDERS', () => {
    const result = normalizeClosedDates([
      { date: '2026-10-20' },
      { date: '2026-10-21', appliesTo: 'bogus' },
    ]);
    expect(result.map((e) => e.appliesTo)).toEqual(['ORDERS', 'ORDERS']);
  });

  it('turns empty name/note into null', () => {
    const [entry] = normalizeClosedDates([
      { date: '2026-10-20', name: '', note: '' },
    ]);
    expect(entry.name).toBeNull();
    expect(entry.note).toBeNull();
  });

  it('drops malformed entries', () => {
    expect(normalizeClosedDates([42, null, { date: 5 }, {}, 'ok'])).toEqual([
      { date: 'ok', name: null, note: null, appliesTo: 'ORDERS' },
    ]);
  });
});

describe('closedDatesAffecting', () => {
  const entries = normalizeClosedDates([
    { date: '2026-01-01', appliesTo: 'ORDERS' },
    { date: '2026-01-02', appliesTo: 'SUBSCRIPTIONS' },
    { date: '2026-01-03', appliesTo: 'BOTH' },
  ]);

  it('ORDERS picks ORDERS and BOTH', () => {
    expect(closedDatesAffecting(entries, 'ORDERS').map((e) => e.date)).toEqual([
      '2026-01-01',
      '2026-01-03',
    ]);
  });

  it('SUBSCRIPTIONS picks SUBSCRIPTIONS and BOTH', () => {
    expect(
      closedDatesAffecting(entries, 'SUBSCRIPTIONS').map((e) => e.date),
    ).toEqual(['2026-01-02', '2026-01-03']);
  });
});
