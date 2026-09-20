"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMealsClient } from "@/lib/api/menu-client";
import { qk, STALE } from "@/lib/query/keys";
import type { CartItem } from "@/lib/store/cart-store";

/**
 * Cross-references cart line items against the live "available meals" list
 * — the cart store only ever holds a stale add-to-cart-time snapshot
 * (name/price/image), so an item the admin later disables or deletes would
 * otherwise sit in the cart indefinitely with no indication anything
 * changed. The public meal listing already excludes unavailable meals, so
 * "not in the list" (disabled or deleted) is exactly the signal needed.
 *
 * The meal list shares the menu's cache entry, so a customer who just
 * browsed the menu gets the answer instantly; it is only fresh for
 * STALE.short because availability is time-sensitive.
 */
export function useCartAvailability(items: CartItem[]): {
  unavailableMealIds: Set<string>;
  loading: boolean;
} {
  const { data: meals, isPending } = useQuery({
    queryKey: qk.meals.list({}),
    queryFn: () => fetchMealsClient(),
    staleTime: STALE.short,
  });

  const unavailableMealIds = useMemo(() => {
    if (!meals) return new Set<string>();
    const availableIds = new Set(meals.map((m) => m.id));
    return new Set(items.filter((item) => !availableIds.has(item.mealId)).map((item) => item.mealId));
  }, [meals, items]);

  return { unavailableMealIds, loading: isPending };
}
