"use client";

import { MAX_ITEM_QUANTITY } from "@/lib/constants/order-limits";
import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import type { Meal } from "@/lib/api/menu";
import { useMealCustomization } from "@/lib/hooks/useMealCustomization";
import { MealCustomizerFields } from "./MealCustomizerFields";
import { MealCartLines } from "./MealCartLines";
import { QuantityStepper } from "./QuantityStepper";
import { useCartStore } from "@/lib/store/cart-store";
import { totalQuantity, useMealCartLines } from "@/lib/store/cart-selectors";
import { useToast } from "@/context/ToastContext";
import { formatPriceFromPaise } from "@/lib/format/currency";

/**
 * The meal detail page's actual add-to-cart surface. When the meal has any
 * active add-on groups, customization gets its own clearly set-apart
 * section (bordered card, heading, "required" hint) rather than blending
 * into the surrounding meal info — a customer should never miss that
 * there's something to configure before adding to cart. A meal with
 * nothing to customize just gets a plain quantity stepper + Add to Cart,
 * no section at all.
 *
 * Whatever is already in the cart shows here too, so the page never offers a
 * fresh "Add to Cart" for something you already added: a plain meal swaps to
 * a live [ - n + ] stepper ("-" at 1 removes it), and a customizable meal
 * lists each existing customization with its own stepper above the form for
 * adding a different one.
 */
export function MealPurchasePanel({
  meal,
  priceInPaise,
}: {
  meal: Meal;
  /** The (possibly discounted) price to actually charge. */
  priceInPaise: number;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartLines = useMealCartLines(meal.id);
  const { showToast } = useToast();
  const {
    groups,
    selections,
    getSelection,
    distinctCount,
    setItemQuantity,
    addonTotalInPaise,
    groupErrors,
    canAdd,
  } = useMealCustomization(meal);
  const [quantity, setQuantity] = useState(1);
  // Units still allowed for this meal once what's already in the cart counts.
  const remainingForMeal = Math.max(1, MAX_ITEM_QUANTITY - totalQuantity(cartLines));

  const hasCustomization = groups.some((g) => g.isActive && g.items.some((i) => i.isAvailable));
  const unitTotalInPaise = priceInPaise + addonTotalInPaise;
  const plainLine = !hasCustomization ? cartLines.find((l) => l.lineKey === meal.id) : undefined;

  function handleAddToCart() {
    addItem(
      {
        mealId: meal.id,
        name: meal.name,
        priceInPaise,
        imageUrl: meal.imageUrl ?? undefined,
        addons: selections.length > 0 ? selections : undefined,
      },
      quantity,
    );
    showToast(`${meal.name} added to cart`, "success");
    setQuantity(1);
  }

  return (
    <div className="flex flex-col gap-5">
      {hasCustomization && cartLines.length > 0 && (
        <MealCartLines mealName={meal.name} lines={cartLines} />
      )}

      {hasCustomization && (
        <section className="rounded-2xl border-2 border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900 dark:bg-primary-950/20">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Customize your order
            </h2>
          </div>
          <MealCustomizerFields
            groups={groups}
            getSelection={getSelection}
            distinctCount={distinctCount}
            setItemQuantity={setItemQuantity}
          />
          {groupErrors.length > 0 && (
            <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
              {groupErrors
                .map(({ group, count }) =>
                  count < group.minSelections
                    ? `Choose ${group.minSelections - count} more from "${group.name}" to continue.`
                    : `Remove ${count - group.maxSelections} from "${group.name}" — only ${group.maxSelections} allowed.`,
                )
                .join(" ")}
            </p>
          )}
        </section>
      )}

      {plainLine ? (
        <div className="flex items-center gap-3">
          <QuantityStepper
            size="md"
            quantity={totalQuantity(cartLines)}
            label={meal.name}
            atLimit={totalQuantity(cartLines) >= MAX_ITEM_QUANTITY}
            onDecrement={() => updateQuantity(plainLine.lineKey, plainLine.quantity - 1)}
            onIncrement={() => updateQuantity(plainLine.lineKey, plainLine.quantity + 1)}
          />
          <Link href="/cart" className="btn-outline flex-1 justify-center">
            View cart
          </Link>
        </div>
      ) : (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(q + 1, remainingForMeal))}
            disabled={quantity >= remainingForMeal}
            title={quantity >= remainingForMeal ? `Max ${MAX_ITEM_QUANTITY} per order` : undefined}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="btn-primary flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {hasCustomization && cartLines.length > 0 ? "Add another" : "Add to Cart"} — {formatPriceFromPaise(unitTotalInPaise * quantity)}
        </button>
      </div>
      )}
    </div>
  );
}
