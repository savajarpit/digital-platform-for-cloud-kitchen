/** class-transformer helpers so "   " can't pass a MinLength/IsNotEmpty
 * rule as a real value. Use with `@Transform(trimString)`. */
export const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** For optional text: whitespace-only becomes "not provided". */
export const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** For emails: trimmed and lower-cased. A non-string is left for the
 * validator to reject (calling .toLowerCase() on it used to throw a 500). */
export const trimLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
