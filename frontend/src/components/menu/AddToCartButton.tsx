"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/context/ToastContext";

export function AddToCartButton({
  mealId,
  name,
  priceInPaise,
  imageUrl,
  disabled,
}: {
  mealId: string;
  name: string;
  priceInPaise: number;
  imageUrl?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("menu");
  const addItem = useCartStore((s) => s.addItem);
  const { showToast } = useToast();

  function handleAdd() {
    addItem({ mealId, name, priceInPaise, imageUrl });
    showToast(`${name} added to cart`, "success");
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className="btn-primary btn-sm"
      aria-label={`${t("addToCart")}: ${name}`}
    >
      <Plus className="h-4 w-4" />
      {t("addToCart")}
    </button>
  );
}
