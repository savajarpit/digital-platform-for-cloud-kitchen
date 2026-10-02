"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  describeShortfall,
  type CartStockShortfall,
} from "@/lib/checkout/stock";

/** Shown when the picked delivery date can't cover the cart — the customer
 * can pick another date above or reduce quantities in the cart. */
export function CheckoutStockNotice({
  shortfalls,
  date,
}: {
  shortfalls: CartStockShortfall[];
  date: string;
}) {
  if (shortfalls.length === 0) return null;
  return (
    <section
      role="alert"
      className="card flex gap-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex flex-col gap-1">
        <ul className="flex flex-col gap-0.5 font-medium">
          {shortfalls.map((s) => (
            <li key={s.mealId}>{describeShortfall(s, date)}</li>
          ))}
        </ul>
        <p>
          Pick another date above, or{" "}
          <Link href="/cart" className="cursor-pointer font-semibold underline">
            update your cart
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
