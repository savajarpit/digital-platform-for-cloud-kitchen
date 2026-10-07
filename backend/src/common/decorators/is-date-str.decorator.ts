import { registerDecorator, type ValidationOptions } from 'class-validator';
import { DateUtil } from '../utils/date.util';

/** A plain calendar date, exactly `YYYY-MM-DD` and real (no "2026-02-30").
 * Use instead of @IsDateString() for tenant-local dates stored as strings:
 * @IsDateString() also accepts "2026-10-06T00:00:00Z", which then never
 * matches a stored "2026-10-06" in string comparisons. */
export function IsDateStr(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isDateStr',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a date in YYYY-MM-DD format`,
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && DateUtil.isValidDateStr(value),
      },
    });
  };
}
