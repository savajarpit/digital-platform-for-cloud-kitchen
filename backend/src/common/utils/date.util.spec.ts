import { DateUtil } from './date.util';

describe('DateUtil.isValidDateStr', () => {
  it('accepts real calendar dates, including leap days', () => {
    expect(DateUtil.isValidDateStr('2026-10-03')).toBe(true);
    expect(DateUtil.isValidDateStr('2028-02-29')).toBe(true);
  });

  it('rejects impossible or malformed dates', () => {
    expect(DateUtil.isValidDateStr('2026-02-30')).toBe(false);
    expect(DateUtil.isValidDateStr('2026-02-29')).toBe(false);
    expect(DateUtil.isValidDateStr('2026-13-01')).toBe(false);
    expect(DateUtil.isValidDateStr('2026-10-3')).toBe(false);
    expect(DateUtil.isValidDateStr('not-a-date')).toBe(false);
  });
});

describe('DateUtil.formatDateStrShort', () => {
  it('formats a YYYY-MM-DD string without shifting the day', () => {
    expect(DateUtil.formatDateStrShort('2026-10-03')).toBe('Sat, 3 Oct');
    expect(DateUtil.formatDateStrShort('2026-09-28')).toBe('Mon, 28 Sept');
  });
});
