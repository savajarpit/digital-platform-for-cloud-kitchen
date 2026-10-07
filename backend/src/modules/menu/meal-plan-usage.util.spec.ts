import { mealInPlansMessage, type MealPlanUsage } from './meal-plan-usage.util';

const day = (
  plan: { id: string; name: string },
  d: Partial<MealPlanUsage['planDay']>,
): MealPlanUsage => ({
  planDay: { dayNumber: null, weekNumber: null, weekday: null, plan, ...d },
});

const sevenDay = { id: 'p1', name: '7-day plan' };
const weekly = { id: 'p2', name: 'Weekly lunch' };

describe('mealInPlansMessage', () => {
  it('is null when no plan uses the meal', () => {
    expect(mealInPlansMessage('Paneer Bowl', [])).toBeNull();
  });

  it('names the plan and its days in order', () => {
    expect(
      mealInPlansMessage('Paneer Bowl', [
        day(sevenDay, { dayNumber: 5 }),
        day(sevenDay, { dayNumber: 2 }),
      ]),
    ).toBe(
      '"Paneer Bowl" is used in 7-day plan (Day 2, Day 5). Swap it out in that plan first, or mark the meal unavailable instead.',
    );
  });

  it('labels weekly plans by week and weekday, and lists every plan', () => {
    expect(
      mealInPlansMessage('Soup', [
        day(sevenDay, { dayNumber: 1 }),
        day(weekly, { weekNumber: 1, weekday: 1 }),
      ]),
    ).toBe(
      '"Soup" is used in 7-day plan (Day 1) and Weekly lunch (Week 1 · Mon). Swap it out in those plans first, or mark the meal unavailable instead.',
    );
  });

  it('shortens a long list of days', () => {
    const days = [1, 2, 3, 4, 5, 6].map((n) => day(sevenDay, { dayNumber: n }));
    expect(mealInPlansMessage('Rice', days)).toContain(
      '(Day 1, Day 2, Day 3, Day 4 +2 more)',
    );
  });

  it('lists a day once even if two slots on it use the meal', () => {
    expect(
      mealInPlansMessage('Rice', [
        day(sevenDay, { dayNumber: 3 }),
        day(sevenDay, { dayNumber: 3 }),
      ]),
    ).toContain('(Day 3)');
  });
});
