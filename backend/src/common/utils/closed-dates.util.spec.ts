import {
  closedDatesAffecting,
  normalizeClosedDates,
} from './closed-dates.util';

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
