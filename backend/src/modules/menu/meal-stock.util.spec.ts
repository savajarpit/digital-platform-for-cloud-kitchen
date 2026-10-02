import {
  findStockShortfall,
  remainingStock,
  stockShortfallMessage,
} from './meal-stock.util';

const meals = [
  { id: 'a', name: 'Paneer Bowl', dailyQuantityLimit: 10 },
  { id: 'b', name: 'Dal Rice', dailyQuantityLimit: null },
];

describe('remainingStock', () => {
  it('never goes negative when the limit was lowered below sales', () => {
    expect(remainingStock(5, 8)).toBe(0);
    expect(remainingStock(10, 3)).toBe(7);
  });
});

describe('findStockShortfall', () => {
  it('allows exactly the remaining stock', () => {
    const sold = new Map([['a', 7]]);
    expect(
      findStockShortfall([{ mealId: 'a', quantity: 3 }], meals, sold),
    ).toBeNull();
  });

  it('sums the same meal across several cart lines', () => {
    const sold = new Map([['a', 7]]);
    expect(
      findStockShortfall(
        [
          { mealId: 'a', quantity: 2 },
          { mealId: 'a', quantity: 2 },
        ],
        meals,
        sold,
      ),
    ).toEqual({ mealId: 'a', name: 'Paneer Bowl', remaining: 3 });
  });

  it('ignores meals without a daily limit', () => {
    expect(
      findStockShortfall([{ mealId: 'b', quantity: 50 }], meals, new Map()),
    ).toBeNull();
  });

  it('reports a sold-out meal with zero remaining', () => {
    const sold = new Map([['a', 12]]);
    expect(
      findStockShortfall([{ mealId: 'a', quantity: 1 }], meals, sold),
    ).toEqual({ mealId: 'a', name: 'Paneer Bowl', remaining: 0 });
  });
});

describe('stockShortfallMessage', () => {
  it('words sold-out and low-stock differently', () => {
    const date = '2026-09-28';
    expect(
      stockShortfallMessage(
        { mealId: 'a', name: 'Paneer Bowl', remaining: 0 },
        date,
      ),
    ).toContain('sold out for Mon');
    expect(
      stockShortfallMessage(
        { mealId: 'a', name: 'Paneer Bowl', remaining: 2 },
        date,
      ),
    ).toContain('Only 2 Paneer Bowl left');
  });
});
