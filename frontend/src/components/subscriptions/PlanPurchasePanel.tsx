import Link from "next/link";
import { Tag } from "lucide-react";
import type { Address } from "@/lib/api/addresses";
import type { DeliverySlot } from "@/lib/api/delivery-slots";
import type { PlanDetail } from "@/lib/api/subscriptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { PlanPurchaseFieldsSkeleton } from "@/components/subscriptions/PlanDetailSkeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

/** What the customer actually pays, after any active promotion. */
export function planPayableInPaise(plan: PlanDetail): number {
  const discountPercentage = plan.activePromotion?.discountPercentage ?? 0;
  return discountPercentage > 0
    ? plan.priceInPaise -
        Math.floor((plan.priceInPaise * discountPercentage) / 100)
    : plan.priceInPaise;
}

/** Anchor the mobile checkout bar scrolls to. */
export const PLAN_CHECKOUT_ID = "plan-checkout";

/** Price, address/time/coupon fields and the Subscribe & Pay button — the
 * top of the plan page's rail. */
export function PlanPurchasePanel({
  plan,
  addresses,
  selectedAddressId,
  onAddressChange,
  deliverySlots,
  selectedSlotId,
  onSlotChange,
  couponCode,
  onCouponChange,
  hasActiveForThisPlan,
  datesMissing,
  isSubscribing,
  onSubscribeClick,
}: {
  plan: PlanDetail;
  addresses: Address[] | null | undefined;
  selectedAddressId: string;
  onAddressChange: (id: string) => void;
  deliverySlots: DeliverySlot[];
  selectedSlotId: string;
  onSlotChange: (id: string) => void;
  couponCode: string;
  onCouponChange: (value: string) => void;
  hasActiveForThisPlan: boolean;
  /** Delivery dates still to pick before checkout (0 = none or no picker). */
  datesMissing: number;
  isSubscribing: boolean;
  onSubscribeClick: () => void;
}) {
  const discountPercentage = plan.activePromotion?.discountPercentage ?? 0;
  const discountedPriceInPaise = planPayableInPaise(plan);

  return (
    <div
      id={PLAN_CHECKOUT_ID}
      className="card flex scroll-mt-24 flex-col gap-4 p-5 sm:p-6"
    >
      <div className="flex items-baseline gap-2">
        {discountPercentage > 0 && (
          <span className="text-lg text-zinc-400 line-through dark:text-zinc-500">
            {formatPriceFromPaise(plan.priceInPaise)}
          </span>
        )}
        <p className="font-display text-3xl font-bold text-primary-600">
          {formatPriceFromPaise(discountedPriceInPaise)}
        </p>
        {discountPercentage > 0 && (
          <span className="badge bg-red-600 text-white">
            {discountPercentage}% off
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        One-time payment for the full {plan.durationDays}-day plan.
      </p>

      {addresses === undefined ? (
        <PlanPurchaseFieldsSkeleton />
      ) : addresses === null ? (
        <Link
          href={`/login?redirect=/plans/${plan.id}`}
          className="btn-primary w-full text-center"
        >
          Log in to subscribe
        </Link>
      ) : addresses.length === 0 ? (
        <Link
          href="/account/addresses"
          className="btn-primary w-full text-center"
        >
          Add a delivery address first
        </Link>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Deliver to
            </label>
            <Select value={selectedAddressId} onValueChange={onAddressChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((addr) => (
                  <SelectItem
                    key={addr.id}
                    value={addr.id}
                    disabled={!addr.serviceable}
                  >
                    {addr.label ? `${addr.label} — ` : ""}
                    {addr.line1}, {addr.city}
                    {!addr.serviceable ? " (not deliverable)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {plan.timeSelectionEnabled && deliverySlots.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Delivery time (every day, unless changed later)
              </label>
              <Select value={selectedSlotId} onValueChange={onSlotChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No preference</SelectItem>
                  {deliverySlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name} ({formatTime12h(slot.startTime)}–
                      {formatTime12h(slot.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Tag className="h-3.5 w-3.5" />
              Coupon code (optional)
            </label>
            <input
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
              placeholder="FIRSTMONTH20"
              className="input"
            />
          </div>
          {hasActiveForThisPlan && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              You already have an active subscription to this plan.
            </p>
          )}
          {datesMissing > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              Pick {datesMissing} more delivery date
              {datesMissing === 1 ? "" : "s"} to continue.
            </p>
          )}
          <button
            type="button"
            onClick={onSubscribeClick}
            disabled={isSubscribing || !selectedAddressId || datesMissing > 0}
            className="btn-primary w-full"
          >
            {isSubscribing ? "Starting…" : "Subscribe & Pay"}
          </button>
        </>
      )}
    </div>
  );
}
