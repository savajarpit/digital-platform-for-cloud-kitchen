import { deliversOn, type PrepCandidate } from './subscription-prep.util';

const TZ = 'Asia/Kolkata';
const istMidnight = (date: string) => new Date(`${date}T00:00:00+05:30`);

const sub = (over: Partial<PrepCandidate> = {}): PrepCandidate => ({
  startDate: istMidnight('2026-09-28'),
  cycleEnd: istMidnight('2026-10-04'),
  usesDateSelection: false,
  scheduledDates: [],
  skips: [],
  ...over,
});

describe('deliversOn', () => {
  it('is false before the first day and after the last', () => {
    expect(deliversOn(sub(), '2026-09-27', TZ)).toBe(false);
    expect(deliversOn(sub(), '2026-10-05', TZ)).toBe(false);
  });

  it('is true on the first and last day of the cycle', () => {
    expect(deliversOn(sub(), '2026-09-28', TZ)).toBe(true);
    expect(deliversOn(sub(), '2026-10-04', TZ)).toBe(true);
  });

  it('is false on a skipped or paused day', () => {
    expect(
      deliversOn(
        sub({ skips: [{ dateFrom: '2026-09-30', dateTo: '2026-10-01' }] }),
        '2026-10-01',
        TZ,
      ),
    ).toBe(false);
  });

  it('date selection: only on a date the subscriber chose', () => {
    const chosen = sub({
      usesDateSelection: true,
      scheduledDates: [{ date: '2026-09-29' }],
    });
    expect(deliversOn(chosen, '2026-09-29', TZ)).toBe(true);
    expect(
      deliversOn({ ...chosen, scheduledDates: [] }, '2026-09-30', TZ),
    ).toBe(false);
  });

  it('is false for a subscription that has not been activated', () => {
    expect(deliversOn(sub({ startDate: null }), '2026-09-28', TZ)).toBe(false);
  });
});
