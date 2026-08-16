"use client";

import { useEffect, useState } from "react";
import { fetchMealsClient } from "@/lib/api/menu-client";
import type { CartItem } from "@/lib/store/cart-store";

/**
 * Cross-references cart line items against the live "available meals" list
 * — the cart store only ever holds a stale add-to-cart-time snapshot
 * (name/price/image), so an item the admin later disables or deletes would
 * otherwise sit in the cart indefinitely with no indication anything
 * changed. The public meal listing already excludes unavailable meals, so
 * "not in the list" (disabled or deleted) is exactly the signal needed.
 */
export function useCartAvailability(items: CartItem[]): {
  unavailableMealIds: Set<string>;
  loading: boolean;
} {
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetchMealsClient().then((meals) => setAvailableIds(new Set(meals.map((m) => m.id))));
  }, []);

  const unavailableMealIds = new Set(
    availableIds
      ? items.filter((item) => !availableIds.has(item.mealId)).map((item) => item.mealId)
      : [],
  );

  return { unavailableMealIds, loading: availableIds === null };
}
