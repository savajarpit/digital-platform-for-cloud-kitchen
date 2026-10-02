import type { CartItem } from "@/lib/store/cart-store";

export interface CartStockShortfall {
  mealId: string;
  name: string;
  wanted: number;
  remaining: number;
}

/** Meals in the cart asking for more than the chosen date still has. The
 * same meal on several lines (different add-ons) shares one daily stock. */
export function cartStockShortfalls(
  items: CartItem[],
  remainingByMeal: Map<string, number>,
): CartStockShortfall[] {
  const wanted = new Map<string, { name: string; quantity: number }>();
  for (const item of items) {
    const entry = wanted.get(item.mealId);
    wanted.set(item.mealId, {
      name: item.name,
      quantity: (entry?.quantity ?? 0) + item.quantity,
    });
  }
  const shortfalls: CartStockShortfall[] = [];
  for (const [mealId, { name, quantity }] of wanted) {
    const remaining = remainingByMeal.get(mealId);
    if (remaining !== undefined && quantity > remaining) {
      shortfalls.push({ mealId, name, wanted: quantity, remaining });
    }
  }
  return shortfalls;
}

/** "Mon, 28 Sep" for a YYYY-MM-DD date, without any timezone shift. */
export function formatStockDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function describeShortfall(
  shortfall: CartStockShortfall,
  date: string,
): string {
  const day = formatStockDate(date);
  return shortfall.remaining === 0
    ? `${shortfall.name} is sold out for ${day}`
    : `Only ${shortfall.remaining} ${shortfall.name} left for ${day} (you have ${shortfall.wanted})`;
}
