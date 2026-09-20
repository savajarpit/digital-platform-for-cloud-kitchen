"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cartLineUnitPrice, useCartStore, type CartItem } from "@/lib/store/cart-store";
import { describeAddons } from "@/lib/store/cart-selectors";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The meal detail page's "already in your cart" list: one row per distinct
 * customization, each with its own stepper (pressing "-" at 1 removes just
 * that line). Adding a NEW customization is the form below it; this is where
 * existing ones are adjusted without leaving the page.
 */
export function MealCartLines({ mealName, lines }: { mealName: string; lines: CartItem[] }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">In your cart</h2>
        </div>
        <Link href="/cart" className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
          View cart
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.lineKey} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="wrap-break-word text-sm text-zinc-700 dark:text-zinc-300">{describeAddons(line)}</p>
              <p className="text-xs text-zinc-400">
                {formatPriceFromPaise(cartLineUnitPrice(line) * line.quantity)}
              </p>
            </div>
            <QuantityStepper
              quantity={line.quantity}
              label={mealName}
              onDecrement={() => updateQuantity(line.lineKey, line.quantity - 1)}
              onIncrement={() => updateQuantity(line.lineKey, line.quantity + 1)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
