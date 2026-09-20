"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock, Tag } from "lucide-react";
import {
  ApiError,
  getPlan,
  getSubscriptionsEnabled,
  listMySubscriptions,
  subscribe,
  verifySubscriptionPayment,
} from "@/lib/api/subscriptions";
import type { Address } from "@/lib/api/addresses";
import { getDeliverySlots } from "@/lib/api/delivery-slots";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { qk, STALE } from "@/lib/query/keys";
import { useAddresses } from "@/lib/query/addresses";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanDaysPreview } from "@/components/subscriptions/PlanDaysPreview";
import {
  PlanDetailSkeleton,
  PlanPurchaseFieldsSkeleton,
} from "@/components/subscriptions/PlanDetailSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const { data: plan, isPending } = useQuery({
    queryKey: qk.plans.detail(id),
    queryFn: () => getPlan(id),
    staleTime: STALE.list,
  });
  // Bounce a direct visit while the tenant has subscriptions switched off.
  // A failed check is ignored (the page just stays).
  const { data: subscriptionsEnabled } = useQuery({
    queryKey: qk.plans.subscriptionsEnabled,
    queryFn: getSubscriptionsEnabled,
    staleTime: STALE.list,
  });
  const addressesQuery = useAddresses();
  const { data: slotsConfig } = useQuery({
    queryKey: qk.checkout.slots,
    queryFn: getDeliverySlots,
    staleTime: STALE.short,
  });
  const { data: mySubscriptions } = useQuery({
    queryKey: qk.subscriptions.list,
    queryFn: listMySubscriptions,
    staleTime: STALE.list,
  });

  const [addressChoice, setAddressChoice] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (subscriptionsEnabled === false) router.replace("/");
  }, [subscriptionsEnabled, router]);

  // undefined = loading, null = logged out, [] = none saved.
  const addressesUnauthorized =
    addressesQuery.error instanceof ApiError && addressesQuery.error.status === 401;
  const addresses: Address[] | null | undefined =
    addressesQuery.data ??
    (addressesQuery.isPending ? undefined : addressesUnauthorized ? null : []);
  // Derived, not stored: the customer's pick if it's still valid, otherwise
  // the default (or first) serviceable address.
  const serviceableAddresses = (addresses ?? []).filter((a) => a.serviceable);
  const selectedAddressId = serviceableAddresses.some((a) => a.id === addressChoice)
    ? addressChoice
    : (serviceableAddresses.find((a) => a.isDefault) ?? serviceableAddresses[0])?.id ?? "";

  const deliverySlots = slotsConfig?.slots ?? [];
  const hasActiveForThisPlan = Boolean(
    mySubscriptions?.some((s) => s.planId === id && s.status === "ACTIVE"),
  );

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
      // A pending subscription now exists.
      void queryClient.invalidateQueries({ queryKey: qk.subscriptions.all });

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
              // Activation flips the subscription to ACTIVE and can schedule orders.
              void queryClient.invalidateQueries({ queryKey: qk.subscriptions.all });
              void queryClient.invalidateQueries({ queryKey: qk.orders.all });
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

  if (!plan) {
    if (isPending) return <PlanDetailSkeleton />;
    return (
      <main className="container-app flex-1 py-12">
        <EmptyState
          icon={CalendarClock}
          title="Plan not found"
          action={
            <Link href="/plans" className="btn-primary">
              Back to plans
            </Link>
          }
        />
      </main>
    );
  }

  const discountPercentage = plan.activePromotion?.discountPercentage ?? 0;
  const discountedPriceInPaise =
    discountPercentage > 0
      ? plan.priceInPaise - Math.floor((plan.priceInPaise * discountPercentage) / 100)
      : plan.priceInPaise;

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

          <PlanDaysPreview plan={plan} />
        </div>

        <div className="card sticky top-24 flex h-fit flex-col gap-4 p-6">
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
              <span className="badge bg-red-600 text-white">{discountPercentage}% off</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One-time payment for the full {plan.durationDays}-day plan.
          </p>

          {addresses === undefined ? (
            <PlanPurchaseFieldsSkeleton />
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
                <Select value={selectedAddressId} onValueChange={setAddressChoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id} disabled={!addr.serviceable}>
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
