import { validateSync } from 'class-validator';
import { IsDateStr } from './is-date-str.decorator';

class Probe {
  @IsDateStr()
  date!: unknown;
}

function errorsFor(date: unknown): number {
  const probe = new Probe();
  probe.date = date;
  return validateSync(probe).length;
}

describe('IsDateStr', () => {
  it('accepts a real YYYY-MM-DD date', () => {
    expect(errorsFor('2026-10-06')).toBe(0);
    expect(errorsFor('2028-02-29')).toBe(0);
  });

  it('rejects datetimes, impossible dates and non-strings', () => {
    expect(errorsFor('2026-10-06T00:00:00Z')).toBe(1);
    expect(errorsFor('2026-02-30')).toBe(1);
    expect(errorsFor('2026-1-6')).toBe(1);
    expect(errorsFor(20261006)).toBe(1);
  });
});
