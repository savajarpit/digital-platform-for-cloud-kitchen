"use client";

import { createPortal } from "react-dom";
import { Repeat, SlidersHorizontal, X } from "lucide-react";
import type { CartItem } from "@/lib/store/cart-store";
import { describeAddons } from "@/lib/store/cart-selectors";

/**
 * Shown when "+" is pressed on a customizable meal that is already in the
 * cart - the same question Swiggy/Zomato ask: repeat the last customization
 * (bumps that line's quantity) or choose a different one (goes to the meal's
 * page, where a new combination becomes its own cart line). Rendered in a
 * portal because the meal card is `overflow-hidden` and hover-transformed,
 * which would clip/misplace a fixed overlay drawn inside it.
 */
export function RepeatCustomizationDialog({
  mealName,
  lastLine,
  onRepeat,
  onChoose,
  onClose,
}: {
  mealName: string;
  lastLine: Pick<CartItem, "addons">;
  onRepeat: () => void;
  onChoose: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Add another ${mealName}`}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-soft sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            Add another {mealName}?
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Last added: {describeAddons(lastLine)}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onRepeat} className="btn-primary cursor-pointer">
            <Repeat className="h-4 w-4" />
            Repeat last
          </button>
          <button type="button" onClick={onChoose} className="btn-outline cursor-pointer">
            <SlidersHorizontal className="h-4 w-4" />
            I&apos;ll choose
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
