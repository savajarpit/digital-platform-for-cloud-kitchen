"use client";

import { useEffect, useState } from "react";
import type { PlanDetail } from "@/lib/api/subscriptions";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { PLAN_CHECKOUT_ID, planPayableInPaise } from "./PlanPurchasePanel";

/** Phones and tablets: the price and a "Checkout" button pinned to the bottom
 * edge, so checkout is always one tap away without scrolling past the
 * calendar. Hides itself while the real checkout card is on screen. */
export function PlanCheckoutBar({
  plan,
  datesPicked,
}: {
  plan: PlanDetail;
  /** Set when the plan has a date picker: how many days are chosen so far. */
  datesPicked: number | null;
}) {
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(PLAN_CHECKOUT_ID);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) =>
      setCheckoutVisible(entry.isIntersecting),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const required = plan.dateSelection?.requiredCount ?? plan.durationDays;
  const incomplete = datesPicked !== null && datesPicked < required;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-200 lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95 ${
        checkoutVisible ? "translate-y-full" : "translate-y-0"
      }`}
      aria-hidden={checkoutVisible}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-bold text-primary-600">
            {formatPriceFromPaise(planPayableInPaise(plan))}
          </p>
          <p
            className={`truncate text-xs ${
              incomplete
                ? "text-amber-700 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {datesPicked !== null
              ? `${datesPicked} of ${required} days selected`
              : `${plan.durationDays}-day plan`}
          </p>
        </div>
        <button
          type="button"
          tabIndex={checkoutVisible ? -1 : 0}
          onClick={() =>
            document
              .getElementById(PLAN_CHECKOUT_ID)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="btn-primary shrink-0 cursor-pointer"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
