import { operatingHoursError } from './operating-hours.util';

const WEEK = {
  mon: { open: '09:00', close: '21:00' },
  tue: { open: '09:00', close: '21:00' },
};

describe('operatingHoursError', () => {
  it('accepts open days with close after open, and closed days', () => {
    expect(operatingHoursError({ ...WEEK, sun: {} })).toBeNull();
  });

  it('accepts a day missing from the map as closed', () => {
    expect(operatingHoursError({ mon: WEEK.mon })).toBeNull();
  });

  it('rejects a day with only one of open/close', () => {
    expect(operatingHoursError({ ...WEEK, wed: { open: '09:00' } })).toBe(
      'Wednesday: set both an opening and a closing time, or mark the day closed.',
    );
  });

  it('rejects close at or before open (overnight hours)', () => {
    expect(
      operatingHoursError({ fri: { open: '22:00', close: '02:00' } }),
    ).toMatch(/^Friday: closing time must be later/);
    expect(
      operatingHoursError({ fri: { open: '10:00', close: '10:00' } }),
    ).toMatch(/^Friday: closing time must be later/);
  });

  it('reports the first bad day in week order', () => {
    expect(
      operatingHoursError({
        sun: { open: '10:00', close: '09:00' },
        mon: { close: '09:00' },
      }),
    ).toMatch(/^Monday:/);
  });

  it('rejects a week with every day closed', () => {
    expect(operatingHoursError({})).toMatch(/at least one day open/);
    expect(operatingHoursError({ mon: {}, tue: {} })).toMatch(
      /at least one day open/,
    );
  });
});
