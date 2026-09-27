import {
  orderDayAvailability,
  orderDayClosedMessage,
  type OrderDaySettings,
} from './order-day-availability.util';

// 2026-09-27 is a Sunday. Kitchen: Mon–Sat 09:00–21:00, Sunday off, cutoff 18:00.
const MON_TO_SAT = {
  mon: { open: '09:00', close: '21:00' },
  tue: { open: '09:00', close: '21:00' },
  wed: { open: '09:00', close: '21:00' },
  thu: { open: '09:00', close: '21:00' },
  fri: { open: '09:00', close: '21:00' },
  sat: { open: '09:00', close: '21:00' },
};
const settings = (over: Partial<OrderDaySettings> = {}): OrderDaySettings => ({
  isTemporarilyClosed: false,
  closureReason: null,
  operatingHours: MON_TO_SAT,
  dailyCutoffTime: '18:00',
  closedDates: [],
  ...over,
});
// "now" = Monday 2026-09-28 at 20:00 — past cutoff, kitchen still open.
const MONDAY_8PM = { dateStr: '2026-09-28', minutesSinceMidnight: 20 * 60 };

describe('orderDayAvailability', () => {
  it('no settings yet: every day is open', () => {
    expect(orderDayAvailability(null, '2026-09-28', MONDAY_8PM)).toEqual({
      open: true,
    });
  });

  it('closed right now still allows scheduling a later day', () => {
    expect(orderDayAvailability(settings(), '2026-09-29', MONDAY_8PM)).toEqual({
      open: true,
    });
  });

  it('today after the cutoff is closed', () => {
    expect(
      orderDayAvailability(settings(), '2026-09-28', MONDAY_8PM),
    ).toMatchObject({ open: false, reason: 'Cutoff passed' });
  });

  it('today before opening is fine — the slot is later in the day', () => {
    expect(
      orderDayAvailability(settings(), '2026-09-28', {
        dateStr: '2026-09-28',
        minutesSinceMidnight: 7 * 60,
      }),
    ).toEqual({ open: true });
  });

  it('without a cutoff, today closes at closing time', () => {
    const s = settings({ dailyCutoffTime: null });
    expect(orderDayAvailability(s, '2026-09-28', MONDAY_8PM)).toEqual({
      open: true,
    });
    expect(
      orderDayAvailability(s, '2026-09-28', {
        dateStr: '2026-09-28',
        minutesSinceMidnight: 21 * 60,
      }),
    ).toMatchObject({ open: false, reason: 'Cutoff passed' });
  });

  it('a weekday with no hours is a weekly off', () => {
    expect(
      orderDayAvailability(settings(), '2026-10-04', MONDAY_8PM),
    ).toMatchObject({ open: false, reason: 'Weekly off' });
  });

  it('no operating hours configured at all is not treated as closed', () => {
    expect(
      orderDayAvailability(
        settings({ operatingHours: {} }),
        '2026-10-04',
        MONDAY_8PM,
      ),
    ).toEqual({ open: true });
  });

  it('an ORDERS or BOTH holiday closes the day; a SUBSCRIPTIONS one does not', () => {
    const s = settings({
      closedDates: [
        { date: '2026-09-29', name: 'Diwali', appliesTo: 'ORDERS' },
        { date: '2026-09-30', appliesTo: 'BOTH' },
        { date: '2026-10-01', name: 'Staff day', appliesTo: 'SUBSCRIPTIONS' },
      ],
    });
    expect(orderDayAvailability(s, '2026-09-29', MONDAY_8PM)).toMatchObject({
      open: false,
      reason: 'Diwali',
    });
    expect(orderDayAvailability(s, '2026-09-30', MONDAY_8PM)).toMatchObject({
      open: false,
      reason: 'Holiday',
    });
    expect(orderDayAvailability(s, '2026-10-01', MONDAY_8PM)).toEqual({
      open: true,
    });
  });

  it('temporarily closed blocks every day, now and later', () => {
    const s = settings({
      isTemporarilyClosed: true,
      closureReason: 'Renovation',
    });
    for (const d of ['2026-09-28', '2026-09-29', '2026-10-10']) {
      expect(orderDayAvailability(s, d, MONDAY_8PM)).toEqual({
        open: false,
        reason: 'Renovation',
        storeClosed: true,
      });
    }
  });

  it('a past date is closed', () => {
    expect(
      orderDayAvailability(settings(), '2026-09-27', MONDAY_8PM),
    ).toMatchObject({ open: false, reason: 'Past date' });
  });
});

describe('orderDayClosedMessage', () => {
  it('explains each kind of closure', () => {
    expect(
      orderDayClosedMessage('2026-10-04', {
        open: false,
        reason: 'Weekly off',
      }),
    ).toBe("We're closed on Sundays — please pick another day.");
    expect(
      orderDayClosedMessage('2026-09-28', {
        open: false,
        reason: 'Cutoff passed',
      }),
    ).toContain('Orders for today are closed');
    expect(
      orderDayClosedMessage('2026-09-29', { open: false, reason: 'Diwali' }),
    ).toBe("We're closed on 2026-09-29 (Diwali) — please pick another date.");
    expect(
      orderDayClosedMessage('2026-09-29', {
        open: false,
        reason: 'Renovation',
        storeClosed: true,
      }),
    ).toBe("We're not taking orders right now — Renovation.");
  });
});
