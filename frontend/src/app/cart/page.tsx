"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Minus, Plus, ShoppingCart, Trash2, TriangleAlert } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/lib/store/cart-store";
import { useCartAvailability } from "@/lib/hooks/useCartAvailability";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { useToast } from "@/context/ToastContext";

export default function CartPage() {
  const t = useTranslations("cart");
  const { showToast } = useToast();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartSubtotal();
  const { unavailableMealIds, loading: checkingAvailability } = useCartAvailability(items);
  const hasUnavailableItems = unavailableMealIds.size > 0;

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
                key={item.mealId}
                className={`card flex items-center gap-4 p-4 ${isUnavailable ? "opacity-60" : ""}`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                  <p className="text-sm text-primary-700 dark:text-primary-400">
                    {formatPriceFromPaise(item.priceInPaise)}
                  </p>
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
                    onClick={() => updateQuantity(item.mealId, item.quantity - 1)}
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
                    onClick={() => updateQuantity(item.mealId, item.quantity + 1)}
                    disabled={isUnavailable}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.mealId)}
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
    </main>
  );
}
