"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, ImageOff, Tag } from "lucide-react";
import {
  ApiError,
  getPlan,
  listMySubscriptions,
  subscribe,
  verifySubscriptionPayment,
  type PlanDetail,
} from "@/lib/api/subscriptions";
import { listAddresses, type Address } from "@/lib/api/addresses";
import { getDeliverySlots, type DeliverySlot } from "@/lib/api/delivery-slots";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [addresses, setAddresses] = useState<Address[] | null | undefined>(undefined);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hasActiveForThisPlan, setHasActiveForThisPlan] = useState(false);

  useEffect(() => {
    getPlan(id)
      .then(setPlan)
      .catch(() => setNotFound(true));
    listAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch((err: unknown) => {
        setAddresses(err instanceof ApiError && err.status === 401 ? null : []);
      });
    getDeliverySlots()
      .then((config) => setDeliverySlots(config.slots))
      .catch(() => setDeliverySlots([]));
    listMySubscriptions()
      .then((subs) => setHasActiveForThisPlan(subs.some((s) => s.planId === id && s.status === "ACTIVE")))
      .catch(() => setHasActiveForThisPlan(false));
  }, [id]);

  function handleSubscribeClick() {
    if (hasActiveForThisPlan) {
      confirm({
        message:
          "You already have an active subscription to this plan — continuing means two deliveries a day. Continue?",
        confirmLabel: "Subscribe Anyway",
        processingLabel: "Starting…",
        onConfirm: () => doSubscribe(),
      });
      return;
    }
    doSubscribe();
  }

  async function doSubscribe() {
    if (!plan || !selectedAddressId) return;
    setIsSubscribing(true);
    try {
      const { subscriptionId, razorpayOrderId, razorpayKeyId, amountInPaise } = await subscribe({
        planId: plan.id,
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
        deliverySlotId: selectedSlotId || undefined,
      });

      await loadRazorpayScript();
      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: amountInPaise,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "Plan subscription",
        description: plan.name,
        handler: (response) => {
          verifySubscriptionPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              router.push(`/account/subscriptions/${subscriptionId}`);
            })
            .catch(() => showToast("Payment succeeded but activation failed — contact support.", "error"));
        },
        modal: {
          ondismiss: () => showToast("Payment cancelled.", "error"),
        },
      });
      razorpay.open();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't start subscription.", "error");
    } finally {
      setIsSubscribing(false);
    }
  }

  if (notFound) {
    return (
      <main className="container-app flex-1 py-16 text-center">
        <h1 className="section-title text-zinc-900 dark:text-zinc-100">Plan not found</h1>
        <Link href="/plans" className="btn-primary mt-6">
          Back to plans
        </Link>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="container-app flex-1 py-12">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-4 h-24 w-full max-w-2xl" />
        <Skeleton className="mt-6 h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="container-app flex-1 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {plan.name}
          </h1>
          {plan.description && (
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">{plan.description}</p>
          )}
          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {plan.durationDays} days
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              Delivered daily to your address
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {plan.days.map((day) => (
              <div key={day.id} className="card p-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Day {day.dayNumber}
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {day.slots.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Meals for this day to be decided.</p>
                  ) : (
                    day.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          {slot.meal?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={slot.meal.imageUrl}
                              alt={slot.meal.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-400">
                            {SLOT_LABELS[slot.slotType] ?? slot.slotType}
                          </p>
                          <p
                            className={
                              slot.meal
                                ? "truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
                                : "truncate text-sm text-zinc-400 italic dark:text-zinc-500"
                            }
                          >
                            {slot.meal?.name ?? "Meal to be announced"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card sticky top-24 flex h-fit flex-col gap-4 p-6">
          <p className="font-display text-3xl font-bold text-primary-600">
            {formatPriceFromPaise(plan.priceInPaise)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One-time payment for the full {plan.durationDays}-day plan.
          </p>

          {addresses === undefined ? (
            <Skeleton className="h-10 w-full" />
          ) : addresses === null ? (
            <Link href={`/login?redirect=/plans/${plan.id}`} className="btn-primary w-full text-center">
              Log in to subscribe
            </Link>
          ) : addresses.length === 0 ? (
            <Link href="/account/addresses" className="btn-primary w-full text-center">
              Add a delivery address first
            </Link>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Deliver to
                </label>
                <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label ? `${addr.label} — ` : ""}
                        {addr.line1}, {addr.city}
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
                  <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No preference</SelectItem>
                      {deliverySlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.name} ({formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)})
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
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="FIRSTMONTH20"
                  className="input"
                />
              </div>
              {hasActiveForThisPlan && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  You already have an active subscription to this plan.
                </p>
              )}
              <button
                type="button"
                onClick={handleSubscribeClick}
                disabled={isSubscribing || !selectedAddressId}
                className="btn-primary w-full"
              >
                {isSubscribing ? "Starting…" : "Subscribe & Pay"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
