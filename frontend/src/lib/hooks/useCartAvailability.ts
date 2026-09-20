"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMealsClient } from "@/lib/api/menu-client";
import { qk } from "@/lib/query/keys";
import type { CartItem } from "@/lib/store/cart-store";

/**
 * Cross-references cart line items against the live "available meals" list
 * — the cart store only ever holds a stale add-to-cart-time snapshot
 * (name/price/image), so an item the admin later disables or deletes would
 * otherwise sit in the cart indefinitely with no indication anything
 * changed. The public meal listing already excludes unavailable meals, so
 * "not in the list" (disabled or deleted) is exactly the signal needed.
 *
 * The meal list shares the menu's cache entry (so cached results show
 * instantly) but availability is GATE data: it is never treated as fresh
 * here, so it refetches on mount and tab focus and a meal a tenant just
 * disabled is flagged straight away.
 */
export function useCartAvailability(items: CartItem[]): {
  unavailableMealIds: Set<string>;
  loading: boolean;
} {
  const { data: meals, isPending } = useQuery({
    queryKey: qk.meals.list({}),
    queryFn: () => fetchMealsClient(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const unavailableMealIds = useMemo(() => {
    if (!meals) return new Set<string>();
    const availableIds = new Set(meals.map((m) => m.id));
    return new Set(items.filter((item) => !availableIds.has(item.mealId)).map((item) => item.mealId));
  }, [meals, items]);

  return { unavailableMealIds, loading: isPending };
}
