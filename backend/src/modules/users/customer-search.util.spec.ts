import { customerSearchConditions } from './customer-search.util';

describe('customerSearchConditions', () => {
  it('returns nothing for a blank search', () => {
    expect(customerSearchConditions('   ')).toEqual([]);
  });

  it('matches a single word against name, email and phone', () => {
    expect(customerSearchConditions(' riya ')).toEqual([
      { firstName: { contains: 'riya', mode: 'insensitive' } },
      { lastName: { contains: 'riya', mode: 'insensitive' } },
      { email: { contains: 'riya', mode: 'insensitive' } },
      { phone: { contains: 'riya' } },
    ]);
  });

  it('matches a full name across first and last name', () => {
    expect(customerSearchConditions('Riya Shah Patel')).toContainEqual({
      AND: [
        { firstName: { contains: 'Riya', mode: 'insensitive' } },
        { lastName: { contains: 'Shah Patel', mode: 'insensitive' } },
      ],
    });
  });

  it.each(['98765 43210', '+91-98765-43210', '(987) 654 3210'])(
    'matches a phone typed as %s by its digits',
    (typed) => {
      const digits = typed.replace(/\D/g, '');
      expect(customerSearchConditions(typed)).toContainEqual({
        phone: { contains: digits },
      });
    },
  );

  it('does not treat a name with a number as a phone', () => {
    expect(
      customerSearchConditions('flat 4012').some(
        (c) =>
          'phone' in c &&
          c.phone &&
          (c.phone as { contains: string }).contains === '4012',
      ),
    ).toBe(false);
  });
});
