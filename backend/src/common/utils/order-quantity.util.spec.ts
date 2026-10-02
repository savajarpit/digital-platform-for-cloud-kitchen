import { mealsOverQuantityLimit } from './order-quantity.util';

describe('mealsOverQuantityLimit', () => {
  it('allows exactly the limit', () => {
    expect(mealsOverQuantityLimit([{ mealId: 'a', quantity: 50 }])).toEqual([]);
  });

  it('adds up the same meal across add-on variant lines', () => {
    expect(
      mealsOverQuantityLimit([
        { mealId: 'a', quantity: 30 },
        { mealId: 'b', quantity: 50 },
        { mealId: 'a', quantity: 21 },
      ]),
    ).toEqual(['a']);
  });

  it('respects a custom limit', () => {
    expect(mealsOverQuantityLimit([{ mealId: 'a', quantity: 3 }], 2)).toEqual([
      'a',
    ]);
  });
});
