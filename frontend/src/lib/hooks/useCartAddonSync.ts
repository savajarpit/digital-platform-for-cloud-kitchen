"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMealsClient } from "@/lib/api/menu-client";
import type { Meal } from "@/lib/api/menu";
import { qk } from "@/lib/query/keys";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/context/ToastContext";

/**
 * Reads the live meal list (shared with the menu's cache entry — for the
 * cart page's own needs, knowing which lines still have editable add-on
 * groups) and, whenever a fresh copy arrives, prunes any add-on sitting in
 * the cart that's gone out of stock (or been deleted entirely) since it was
 * added: auto-removes just that add-on, keeps the meal itself, and tells the
 * customer what changed via a toast. Matches how Zomato/Swiggy handle this
 * (auto-adjust + notify) rather than blocking checkout outright — the
 * backend still independently refuses an order with a genuinely unavailable
 * add-on regardless of this running, so this is a UX improvement, not the
 * actual safety net.
 */
export function useCartAddonSync({ enabled = true }: { enabled?: boolean } = {}): {
  mealsById: Map<string, Meal>;
  loading: boolean;
} {
  const updateItemAddons = useCartStore((s) => s.updateItemAddons);
  const { showToast } = useToast();
  const { data: meals, isPending } = useQuery({
    queryKey: qk.meals.list({}),
    queryFn: () => fetchMealsClient(),
    // Add-on availability (and the add-on feature itself) is gate data: never
    // treated as fresh, so a tenant turning add-ons off is picked up on the
    // next visit/focus instead of after a cache window.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled,
  });

  const mealsById = useMemo(() => new Map((meals ?? []).map((m) => [m.id, m])), [meals]);

  useEffect(() => {
    if (!meals) return;
    const items = useCartStore.getState().items;
    for (const item of items) {
      if (!item.addons || item.addons.length === 0) continue;
      const meal = mealsById.get(item.mealId);
      const availableAddonIds = new Set(
        (meal?.addonGroups ?? []).flatMap((g) =>
          g.isActive ? g.items.filter((i) => i.isAvailable).map((i) => i.id) : [],
        ),
      );
      const stillValid = item.addons.filter((a) => availableAddonIds.has(a.addonItemId));
      if (stillValid.length === item.addons.length) continue;

      const removedNames = item.addons
        .filter((a) => !availableAddonIds.has(a.addonItemId))
        .map((a) => a.name);
      updateItemAddons(item.lineKey, stillValid);
      showToast(`${removedNames.join(", ")} removed from ${item.name} — no longer available.`, "error");
    }
    // Runs when a new copy of the meal list arrives — nothing else changes a
    // meal's own add-on availability mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals]);

  return { mealsById, loading: isPending };
}
