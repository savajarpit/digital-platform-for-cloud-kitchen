"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api/addresses";
import { previewOrder } from "@/lib/api/orders";
import { formatPriceFromPaise } from "@/lib/format/currency";
import type { CartItem } from "@/lib/store/cart-store";
import { useToast } from "@/context/ToastContext";

export interface AppliedCoupon {
  code: string;
  discountInPaise: number;
}

/** The order-summary card on the checkout page: line items, coupon entry,
 * totals and the pay button. The parent owns the applied coupon (it feeds the
 * totals); the typing/applying state of the coupon box lives here. */
export function CheckoutSummaryCard({
  items,
  subtotal,
  appliedCoupon,
  onCouponApplied,
  onCouponRemoved,
  isPickup,
  qualifiesForFreeDelivery,
  deliveryFeeInPaise,
  totalInPaise,
  minOrderInPaise,
  placeDisabled,
  isPlacingOrder,
  onPlaceOrder,
}: {
  items: CartItem[];
  subtotal: number;
  appliedCoupon: AppliedCoupon | null;
  onCouponApplied: (coupon: AppliedCoupon) => void;
  onCouponRemoved: () => void;
  isPickup: boolean;
  qualifiesForFreeDelivery: boolean;
  deliveryFeeInPaise: number;
  totalInPaise: number;
  /** Set only when the subtotal is below this address's minimum order. */
  minOrderInPaise: number | null;
  placeDisabled: boolean;
  isPlacingOrder: boolean;
  onPlaceOrder: () => void;
}) {
  const t = useTranslations("checkout");
  const { showToast } = useToast();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const couponDiscountInPaise = appliedCoupon?.discountInPaise ?? 0;

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const preview = await previewOrder({
        items: items.map((i) => ({
          mealId: i.mealId,
          quantity: i.quantity,
          addons: i.addons?.map((a) => ({ addonItemId: a.addonItemId, quantity: a.quantity })),
        })),
        couponCode: code,
      });
      if (!preview.couponApplied) {
        setCouponError("Invalid coupon code");
        return;
      }
      onCouponApplied({ code: code.toUpperCase(), discountInPaise: preview.discountInPaise });
      setCouponInput("");
      showToast(t("couponApplied", { code: code.toUpperCase() }), "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not apply this coupon.";
      setCouponError(message);
      showToast(message, "error");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    onCouponRemoved();
    setCouponError(null);
  }

  return (
    <div className="card h-fit p-6">
      <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">{t("orderSummary")}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((item) => (
          <li key={item.lineKey} className="flex flex-col gap-1 text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between gap-3">
              <span className="min-w-0 wrap-break-word">
                {item.name} × {item.quantity}
              </span>
              <span className="shrink-0">{formatPriceFromPaise(item.priceInPaise * item.quantity)}</span>
            </div>
            {item.addons && item.addons.length > 0 && (
              <ul className="flex flex-col gap-0.5 pl-3 text-xs text-zinc-400">
                {item.addons.map((a) => (
                  <li key={a.addonItemId} className="flex justify-between gap-2">
                    <span>
                      + {a.name} × {a.quantity}
                    </span>
                    <span>{formatPriceFromPaise(a.priceInPaise * a.quantity * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm dark:bg-primary-950">
            <span className="font-medium text-primary-700 dark:text-primary-400">
              {t("couponApplied", { code: appliedCoupon.code })}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="cursor-pointer text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400"
            >
              {t("remove")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="couponCode" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("haveCoupon")}
            </label>
            <div className="flex gap-2">
              <input
                id="couponCode"
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t("couponPlaceholder")}
                className="input flex-1 uppercase"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponInput.trim()}
                className="btn-outline shrink-0 cursor-pointer text-sm"
              >
                {isApplyingCoupon ? t("applying") : t("apply")}
              </button>
            </div>
            {couponError && <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Subtotal</span>
          <span>{formatPriceFromPaise(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>
              {t("discount")} ({appliedCoupon.code})
            </span>
            <span>-{formatPriceFromPaise(couponDiscountInPaise)}</span>
          </div>
        )}
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Delivery fee</span>
          {isPickup || qualifiesForFreeDelivery ? (
            <span className="font-medium text-primary-600">{isPickup ? "—" : t("freeDelivery")}</span>
          ) : (
            <span>{formatPriceFromPaise(deliveryFeeInPaise)}</span>
          )}
        </div>
        <div className="mt-1 flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100">
          <span>Total</span>
          <span>{formatPriceFromPaise(totalInPaise)}</span>
        </div>
      </div>

      {minOrderInPaise !== null && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Minimum order ₹{(minOrderInPaise / 100).toFixed(0)} for this address.
        </p>
      )}

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={placeDisabled}
        className="btn-primary mt-6 w-full"
      >
        {isPlacingOrder ? (
          t("placingOrder")
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            {t("payNow")}
          </>
        )}
      </button>
      <Link
        href="/account/addresses"
        className="mt-3 block text-center text-xs text-zinc-500 hover:text-primary-600"
      >
        {t("manageAddresses")}
      </Link>
    </div>
  );
}
