"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { Meal } from "@/lib/api/menu";
import type { CartAddonSelection } from "@/lib/store/cart-store";
import { useMealCustomization } from "@/lib/hooks/useMealCustomization";
import { MealCustomizerFields } from "./MealCustomizerFields";
import { formatPriceFromPaise } from "@/lib/format/currency";

/**
 * Popup used to edit an already-in-cart line's customization (see the cart
 * page's "Edit customization" action) — the meal detail page renders the
 * same picker inline instead, via MealPurchasePanel/MealCustomizerFields,
 * no popup for the add-to-cart flow itself.
 */
export function CustomizeMealSheet({
  meal,
  initialSelections,
  initialQuantity = 1,
  hideQuantityStepper = false,
  confirmLabel = "Add",
  onClose,
  onAdd,
}: {
  meal: Meal;
  initialSelections?: CartAddonSelection[];
  initialQuantity?: number;
  /** Editing an existing cart line's customization shouldn't also let you
   * change its quantity — that's the cart page's own +/- stepper's job. */
  hideQuantityStepper?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onAdd: (addons: CartAddonSelection[], quantity: number) => void;
}) {
  const { groups, selections, getSelection, distinctCount, setItemQuantity, addonTotalInPaise, canAdd } =
    useMealCustomization(meal, initialSelections);
  const [quantity, setQuantity] = useState(initialQuantity);
  const unitTotalInPaise = meal.priceInPaise + addonTotalInPaise;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-soft sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
              Customize {meal.name}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatPriceFromPaise(meal.priceInPaise)} base
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <MealCustomizerFields
          groups={groups}
          getSelection={getSelection}
          distinctCount={distinctCount}
          setItemQuantity={setItemQuantity}
        />

        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {hideQuantityStepper ? (
            <span />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => onAdd(selections, quantity)}
            className="btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel} {formatPriceFromPaise(unitTotalInPaise * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}
