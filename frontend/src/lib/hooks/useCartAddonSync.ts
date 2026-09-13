"use client";

import { useEffect, useState } from "react";
import { fetchMealsClient } from "@/lib/api/menu-client";
import type { Meal } from "@/lib/api/menu";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/context/ToastContext";

/**
 * Fetches the live meal list once (for the cart page's own needs — knowing
 * which lines still have editable add-on groups) and, in the same pass,
 * prunes any add-on sitting in the cart that's gone out of stock (or been
 * deleted entirely) since it was added: auto-removes just that add-on,
 * keeps the meal itself, and tells the customer what changed via a toast.
 * Matches how Zomato/Swiggy handle this (auto-adjust + notify) rather than
 * blocking checkout outright — the backend still independently refuses an
 * order with a genuinely unavailable add-on regardless of this running, so
 * this is a UX improvement, not the actual safety net.
 */
export function useCartAddonSync(): { mealsById: Map<string, Meal>; loading: boolean } {
  const updateItemAddons = useCartStore((s) => s.updateItemAddons);
  const { showToast } = useToast();
  const [mealsById, setMealsById] = useState<Map<string, Meal> | null>(null);

  useEffect(() => {
    fetchMealsClient().then((meals) => {
      const map = new Map(meals.map((m) => [m.id, m]));
      setMealsById(map);

      const items = useCartStore.getState().items;
      for (const item of items) {
        if (!item.addons || item.addons.length === 0) continue;
        const meal = map.get(item.mealId);
        const availableAddonIds = new Set(
          (meal?.addonGroups ?? []).flatMap((g) =>
            g.items.filter((i) => i.isAvailable).map((i) => i.id),
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
    });
    // Runs once when the cart page loads — nothing else changes a meal's
    // own add-on availability mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mealsById: mealsById ?? new Map(), loading: mealsById === null };
}
