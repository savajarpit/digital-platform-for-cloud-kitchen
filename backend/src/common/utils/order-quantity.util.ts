import { MAX_ITEM_QUANTITY } from '../constants/order-limits.constant';

/** Total quantity per meal across every cart line — the same meal can be
 * split over several lines by different add-on picks, and the per-line DTO
 * cap alone would let 50 lines × 50 slip through. Returns the meal ids
 * whose combined quantity exceeds the cap. */
export function mealsOverQuantityLimit(
  items: { mealId: string; quantity: number }[],
  limit: number = MAX_ITEM_QUANTITY,
): string[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.mealId, (totals.get(item.mealId) ?? 0) + item.quantity);
  }
  return [...totals].filter(([, qty]) => qty > limit).map(([id]) => id);
}
