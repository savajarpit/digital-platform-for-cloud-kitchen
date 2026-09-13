"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Minus, Pencil, Plus, ShoppingCart, Trash2, TriangleAlert } from "lucide-react";
import {
  cartLineUnitPrice,
  useCartStore,
  useCartSubtotal,
  type CartAddonSelection,
} from "@/lib/store/cart-store";
import { useCartAvailability } from "@/lib/hooks/useCartAvailability";
import { useCartAddonSync } from "@/lib/hooks/useCartAddonSync";
import { CustomizeMealSheet } from "@/components/menu/CustomizeMealSheet";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { useToast } from "@/context/ToastContext";

export default function CartPage() {
  const t = useTranslations("cart");
  const { showToast } = useToast();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateItemAddons = useCartStore((s) => s.updateItemAddons);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartSubtotal();
  const { unavailableMealIds, loading: checkingAvailability } = useCartAvailability(items);
  const { mealsById } = useCartAddonSync();
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const hasUnavailableItems = unavailableMealIds.size > 0;
  const editingItem = items.find((i) => i.lineKey === editingLineKey);
  const editingMeal = editingItem ? mealsById.get(editingItem.mealId) : undefined;

  if (items.length === 0) {
    return (
      <main className="container-app flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <ShoppingCart className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
        <p className="text-base text-zinc-600 dark:text-zinc-400">{t("empty")}</p>
        <Link href="/menu" className="btn-primary">
          {t("browseMenu")}
        </Link>
      </main>
    );
  }

  return (
    <main className="container-app flex-1 py-10">
      <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => {
            const isUnavailable = unavailableMealIds.has(item.mealId);
            return (
              <div
                key={item.lineKey}
                className={`card flex items-center gap-4 p-4 ${isUnavailable ? "opacity-60" : ""}`}
              >
                <Link href={`/menu/${item.mealId}`} className="shrink-0">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/menu/${item.mealId}`}>
                    <p className="truncate font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                      {item.name}
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-400">
                      {formatPriceFromPaise(item.priceInPaise)}
                    </p>
                    {item.addons && item.addons.length > 0 && (
                      <>
                        <ul className="mt-0.5 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.addons.map((a) => (
                            <li key={a.addonItemId} className="flex justify-between gap-2">
                              <span>
                                + {a.name} × {a.quantity}
                              </span>
                              <span>{formatPriceFromPaise(a.priceInPaise * a.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-0.5 flex justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          <span>Add-ons total</span>
                          <span>
                            {formatPriceFromPaise(cartLineUnitPrice(item) - item.priceInPaise)}
                          </span>
                        </p>
                        <p className="mt-1 flex justify-between gap-2 border-t border-zinc-100 pt-1 text-sm font-semibold text-primary-700 dark:border-zinc-800 dark:text-primary-400">
                          <span>Per item</span>
                          <span>{formatPriceFromPaise(cartLineUnitPrice(item))}</span>
                        </p>
                      </>
                    )}
                  </Link>
                  {(mealsById.get(item.mealId)?.addonGroups ?? []).some(
                    (g) => g.isActive && g.items.length > 0,
                  ) && (
                    <button
                      type="button"
                      onClick={() => setEditingLineKey(item.lineKey)}
                      className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Pencil className="h-3 w-3" />
                      {item.addons && item.addons.length > 0 ? "Edit customization" : "Customize"}
                    </button>
                  )}
                  {isUnavailable && (
                    <span className="badge mt-1 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                      <TriangleAlert className="h-3 w-3" />
                      No longer available
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                    disabled={isUnavailable}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                    disabled={isUnavailable}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.lineKey)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label={t("remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="card h-fit p-6">
          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>{t("subtotal")}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatPriceFromPaise(subtotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Delivery fee calculated at checkout.</p>
          {hasUnavailableItems && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Remove the unavailable item(s) above to continue.
            </p>
          )}
          {hasUnavailableItems || checkingAvailability ? (
            <button
              type="button"
              onClick={() => {
                if (hasUnavailableItems) {
                  showToast("Remove unavailable items to continue.", "error");
                }
              }}
              className="btn-primary mt-6 w-full opacity-50"
            >
              {t("checkout")}
            </button>
          ) : (
            <Link href="/checkout" className="btn-primary mt-6 w-full">
              {t("checkout")}
            </Link>
          )}
        </div>
      </div>

      {editingItem && editingMeal && (
        <CustomizeMealSheet
          meal={editingMeal}
          initialSelections={editingItem.addons}
          initialQuantity={editingItem.quantity}
          hideQuantityStepper
          confirmLabel="Save"
          onClose={() => setEditingLineKey(null)}
          onAdd={(addons: CartAddonSelection[]) => {
            updateItemAddons(editingItem.lineKey, addons);
            setEditingLineKey(null);
            showToast("Customization updated", "success");
          }}
        />
      )}
    </main>
  );
}
