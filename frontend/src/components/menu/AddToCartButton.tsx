"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Meal } from "@/lib/api/menu";
import { useCartStore, type CartAddonSelection } from "@/lib/store/cart-store";
import { totalQuantity, useMealCartLines } from "@/lib/store/cart-selectors";
import { useToast } from "@/context/ToastContext";
import { CustomizeMealSheet } from "./CustomizeMealSheet";
import { QuantityStepper } from "./QuantityStepper";
import { RepeatCustomizationDialog } from "./RepeatCustomizationDialog";

/**
 * The grid card's cart control - a sibling of the card's own detail-page
 * Link, never nested inside it, so its click never fights the card's
 * navigation.
 *
 * The label is always "Add to cart", customizable or not (consistent across
 * every card); for a meal with add-on groups the click opens the
 * customization popup first instead of adding straight away.
 *
 * Once the meal is in the cart the button becomes a [ - n + ] stepper, the
 * way Swiggy/Zomato do:
 *  - "-" at 1 removes the item (the button turns back into "Add to cart"),
 *  - on a customizable meal "n" is the TOTAL across its customizations, "-"
 *    lowers the most recent one, and "+" asks "Repeat last" (bump that line)
 *    or "I'll choose" (open the customization popup for a different
 *    combination, which becomes its own cart line).
 */
export function AddToCartButton({
  meal,
  priceInPaise,
  disabled,
}: {
  meal: Meal;
  /** The (possibly discounted) price to actually charge. */
  priceInPaise: number;
  disabled?: boolean;
}) {
  const t = useTranslations("menu");
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const { showToast } = useToast();
  const lines = useMealCartLines(meal.id);
  const [askingRepeat, setAskingRepeat] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  const hasAddonGroups = (meal.addonGroups ?? []).some(
    (g) => g.isActive && g.items.some((i) => i.isAvailable),
  );
  const inCart = totalQuantity(lines);
  const lastLine = lines[lines.length - 1];

  function addPlain() {
    addItem({ mealId: meal.id, name: meal.name, priceInPaise, imageUrl: meal.imageUrl ?? undefined });
    showToast(`${meal.name} added to cart`, "success");
  }

  function addCustomized(addons: CartAddonSelection[], quantity: number) {
    addItem(
      {
        mealId: meal.id,
        name: meal.name,
        priceInPaise,
        imageUrl: meal.imageUrl ?? undefined,
        addons: addons.length > 0 ? addons : undefined,
      },
      quantity,
    );
    showToast(`${meal.name} added to cart`, "success");
    setCustomizing(false);
  }

  // Portalled: the card is overflow-hidden and hover-transformed, which
  // would clip or misplace a fixed overlay drawn inside it.
  const sheet =
    customizing &&
    createPortal(
      <CustomizeMealSheet
        meal={meal}
        confirmLabel="Add to cart"
        onClose={() => setCustomizing(false)}
        onAdd={addCustomized}
      />,
      document.body,
    );

  if (inCart > 0 && lastLine) {
    return (
      <>
        <QuantityStepper
          quantity={inCart}
          label={meal.name}
          incrementDisabled={disabled}
          onDecrement={() => updateQuantity(lastLine.lineKey, lastLine.quantity - 1)}
          onIncrement={() =>
            hasAddonGroups
              ? setAskingRepeat(true)
              : updateQuantity(lastLine.lineKey, lastLine.quantity + 1)
          }
        />
        {askingRepeat && (
          <RepeatCustomizationDialog
            mealName={meal.name}
            lastLine={lastLine}
            onClose={() => setAskingRepeat(false)}
            onRepeat={() => {
              updateQuantity(lastLine.lineKey, lastLine.quantity + 1);
              setAskingRepeat(false);
            }}
            onChoose={() => {
              setAskingRepeat(false);
              setCustomizing(true);
            }}
          />
        )}
        {sheet}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={hasAddonGroups ? () => setCustomizing(true) : addPlain}
        disabled={disabled}
        className="btn-primary btn-sm"
        aria-label={`${t("addToCart")}: ${meal.name}`}
      >
        <Plus className="h-4 w-4" />
        {t("addToCart")}
      </button>
      {sheet}
    </>
  );
}
