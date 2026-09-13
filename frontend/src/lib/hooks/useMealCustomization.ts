"use client";

import { useState } from "react";
import type { Meal } from "@/lib/api/menu";
import type { CartAddonSelection } from "@/lib/store/cart-store";

export interface AddonSelectionState {
  addonItemId: string;
  name: string;
  priceInPaise: number;
  quantity: number;
}

/**
 * Shared selection state/logic behind both the cart-edit popup
 * (CustomizeMealSheet) and the meal detail page's inline customizer — one
 * place enforcing the two caps: a group's own minSelections/maxSelections
 * (how many *distinct* items can be picked — capped at 1 behaves like a
 * radio button, clearing any other pick in that same group) and each
 * item's own maxQuantityPerOrder (the +/- stepper cap once picked).
 */
export function useMealCustomization(meal: Meal, initialSelections?: CartAddonSelection[]) {
  const groups = meal.addonGroups ?? [];
  const [selections, setSelections] = useState<AddonSelectionState[]>(initialSelections ?? []);

  function getSelection(addonItemId: string): AddonSelectionState | undefined {
    return selections.find((s) => s.addonItemId === addonItemId);
  }

  function distinctCount(groupId: string): number {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return 0;
    const idsInGroup = new Set(group.items.map((i) => i.id));
    return selections.filter((s) => idsInGroup.has(s.addonItemId)).length;
  }

  function setItemQuantity(
    groupId: string,
    item: { id: string; name: string; priceInPaise: number },
    nextQuantity: number,
  ) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setSelections((prev) => {
      const withoutItem = prev.filter((s) => s.addonItemId !== item.id);
      if (nextQuantity <= 0) return withoutItem;

      const base =
        group.maxSelections === 1
          ? withoutItem.filter((s) => !group.items.some((i) => i.id === s.addonItemId))
          : withoutItem;

      return [
        ...base,
        { addonItemId: item.id, name: item.name, priceInPaise: item.priceInPaise, quantity: nextQuantity },
      ];
    });
  }

  const addonTotalInPaise = selections.reduce((sum, s) => sum + s.priceInPaise * s.quantity, 0);

  const groupErrors = groups
    .filter((g) => g.isActive)
    .map((g) => ({ group: g, count: distinctCount(g.id) }))
    .filter(({ group, count }) => count < group.minSelections || count > group.maxSelections);
  const canAdd = groupErrors.length === 0;

  return {
    groups,
    selections,
    getSelection,
    distinctCount,
    setItemQuantity,
    addonTotalInPaise,
    groupErrors,
    canAdd,
  };
}
