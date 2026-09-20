"use client";

import { Minus, Plus } from "lucide-react";

/**
 * The [ - 2 + ] control shown in place of "Add" once an item is in the cart
 * (the Swiggy/Zomato pattern). Pressing "-" at 1 hands `onDecrement` the
 * chance to remove the line, so the caller decides what "below 1" means;
 * the label names the meal for screen readers.
 */
export function QuantityStepper({
  quantity,
  onDecrement,
  onIncrement,
  incrementDisabled,
  label,
  size = "sm",
}: {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  incrementDisabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div
      className="inline-flex items-center rounded-xl border-2 border-primary-600 bg-white dark:bg-zinc-900"
      role="group"
      aria-label={`Quantity of ${label}`}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={quantity <= 1 ? `Remove ${label} from cart` : `Decrease ${label}`}
        className={`${box} flex cursor-pointer items-center justify-center rounded-l-lg text-primary-700 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950`}
      >
        <Minus className={icon} />
      </button>
      <span
        className="min-w-7 px-1 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100"
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label={`Increase ${label}`}
        className={`${box} flex cursor-pointer items-center justify-center rounded-r-lg text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-primary-400 dark:hover:bg-primary-950`}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
