"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMealStock } from "@/lib/api/menu-client";
import { qk } from "@/lib/query/keys";
import {
  cartStockShortfalls,
  type CartStockShortfall,
} from "@/lib/checkout/stock";
import type { CartItem } from "@/lib/store/cart-store";

/**
 * Daily-stock check for the delivery date the customer has picked. Only
 * asks the server when some cart meal actually has a daily limit — the
 * cart snapshot carries no limit, so the menu's `dailyQuantityLimit` isn't
 * available here; instead the stock endpoint answers for every limited
 * meal at once and unlimited meals are simply absent from it. Gate data,
 * so it's never treated as fresh. A failed lookup shows nothing: the
 * backend still rejects an oversold order on its own.
 */
export function useCartStock(
  items: CartItem[],
  date: string | null,
): CartStockShortfall[] {
  const { data: remaining } = useQuery({
    queryKey: qk.meals.stock(date ?? ""),
    queryFn: () => fetchMealStock(date!),
    enabled: Boolean(date) && items.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return useMemo(
    () => (remaining ? cartStockShortfalls(items, remaining) : []),
    [items, remaining],
  );
}
