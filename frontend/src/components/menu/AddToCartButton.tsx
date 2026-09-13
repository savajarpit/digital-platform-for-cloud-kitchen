"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Meal } from "@/lib/api/menu";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/context/ToastContext";

/**
 * The grid card's quick-add button — sits as a sibling to the card's own
 * detail-page Link, never nested inside it, so its click never fights the
 * card's navigation. A meal with any active add-on group can't be
 * meaningfully "quick added" (there's a required pick, or at least a
 * choice to make), so it just routes to the detail page instead, where
 * the actual customize section lives; a plain meal adds straight to cart.
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
  const { showToast } = useToast();

  const hasAddonGroups = (meal.addonGroups ?? []).some(
    (g) => g.isActive && g.items.some((i) => i.isAvailable),
  );

  if (hasAddonGroups) {
    return (
      <Link href={`/menu/${meal.id}`} className="btn-primary btn-sm" aria-label={`Customize: ${meal.name}`}>
        <Plus className="h-4 w-4" />
        Customize
      </Link>
    );
  }

  function handleAdd() {
    addItem({ mealId: meal.id, name: meal.name, priceInPaise, imageUrl: meal.imageUrl ?? undefined });
    showToast(`${meal.name} added to cart`, "success");
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className="btn-primary btn-sm"
      aria-label={`${t("addToCart")}: ${meal.name}`}
    >
      <Plus className="h-4 w-4" />
      {t("addToCart")}
    </button>
  );
}
