import { Prisma } from '../../generated/prisma';

/** Matches the admin customer search box against what staff type: a first
 * or last name, a full name ("Riya Shah"), an email, or a phone number
 * however it's written ("98765 43210", "+91-98765-43210"). */
export function customerSearchConditions(
  rawSearch: string,
): Prisma.UserWhereInput[] {
  const search = rawSearch.trim();
  if (!search) return [];
  const conditions: Prisma.UserWhereInput[] = [
    { firstName: { contains: search, mode: 'insensitive' } },
    { lastName: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search } },
  ];

  const words = search.split(/\s+/);
  if (words.length >= 2) {
    conditions.push({
      AND: [
        { firstName: { contains: words[0], mode: 'insensitive' } },
        {
          lastName: {
            contains: words.slice(1).join(' '),
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  // Mostly digits → a phone number typed with spaces/dashes/+91.
  const digits = search.replace(/\D/g, '');
  const compact = search.replace(/[\s()+-]/g, '');
  if (digits.length >= 4 && digits.length === compact.length) {
    conditions.push({ phone: { contains: digits } });
  }
  return conditions;
}
