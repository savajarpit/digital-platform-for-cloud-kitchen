import { DateUtil } from '../../common/utils/date.util';

/** Pending online checkouts hold their stock this long — long enough to
 * finish a Razorpay payment, short enough that an abandoned cart frees its
 * plates again (the same "cart hold" idea ticketing/food apps use). */
export const STOCK_HOLD_MINUTES = 15;

export interface StockLimitedMeal {
  id: string;
  name: string;
  dailyQuantityLimit: number | null;
}

export interface StockShortfall {
  mealId: string;
  name: string;
  remaining: number;
}

/** Plates still orderable for one day — never negative (an admin lowering
 * the limit below what's already sold just means "sold out"). */
export function remainingStock(limit: number, sold: number): number {
  return Math.max(0, limit - sold);
}

/** First meal in the cart asking for more than that day's remaining stock,
 * or null when every line fits. Quantities are summed per meal, since the
 * same meal can sit on several cart lines (different add-on picks, a free
 * BOGO line) and all of them come out of the same daily stock. */
export function findStockShortfall(
  requested: { mealId: string; quantity: number }[],
  meals: StockLimitedMeal[],
  soldByMeal: Map<string, number>,
): StockShortfall | null {
  const totals = new Map<string, number>();
  for (const item of requested) {
    totals.set(item.mealId, (totals.get(item.mealId) ?? 0) + item.quantity);
  }
  for (const meal of meals) {
    if (meal.dailyQuantityLimit === null) continue;
    const wanted = totals.get(meal.id) ?? 0;
    if (wanted === 0) continue;
    const remaining = remainingStock(
      meal.dailyQuantityLimit,
      soldByMeal.get(meal.id) ?? 0,
    );
    if (wanted > remaining) {
      return { mealId: meal.id, name: meal.name, remaining };
    }
  }
  return null;
}

/** Customer-facing sentence for a shortfall on a given YYYY-MM-DD date. */
export function stockShortfallMessage(
  shortfall: StockShortfall,
  dateStr: string,
): string {
  const day = DateUtil.formatDateStrShort(dateStr);
  if (shortfall.remaining === 0) {
    return `${shortfall.name} is sold out for ${day} — please remove it or pick another date.`;
  }
  return `Only ${shortfall.remaining} ${shortfall.name} left for ${day} — please reduce the quantity or pick another date.`;
}
