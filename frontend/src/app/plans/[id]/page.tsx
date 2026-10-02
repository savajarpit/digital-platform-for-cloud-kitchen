"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock } from "lucide-react";
import {
  ApiError,
  getPlan,
  getPlanPageSettings,
  listMySubscriptions,
  subscribe,
  verifySubscriptionPayment,
} from "@/lib/api/subscriptions";
import type { Address } from "@/lib/api/addresses";
import { getSubscriptionDeliverySlots } from "@/lib/api/delivery-slots";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { qk, STALE } from "@/lib/query/keys";
import { useAddresses } from "@/lib/query/addresses";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanMenuView } from "@/components/subscriptions/PlanMenuView";
import { DeliveryDateSelector } from "@/components/subscriptions/DeliveryDateSelector";
import { PlanPurchasePanel } from "@/components/subscriptions/PlanPurchasePanel";
import { PlanCheckoutBar } from "@/components/subscriptions/PlanCheckoutBar";
import { initialSelection } from "@/lib/plan-calendar/date-selection";
import { PlanDetailSkeleton } from "@/components/subscriptions/PlanDetailSkeleton";
import { usePlanLayoutHint } from "@/components/subscriptions/PlanLayoutHint";
import { useRazorpayBranding } from "@/lib/razorpay/useRazorpayBranding";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const { data: pageSettings } = useQuery({
    queryKey: qk.plans.pageSettings,
    queryFn: getPlanPageSettings,
    staleTime: STALE.list,
  });
  const subscriptionsEnabled = pageSettings?.isEnabled;
  const layoutHint = usePlanLayoutHint();
  const razorpayBranding = useRazorpayBranding();
  const addressesQuery = useAddresses();
  const { data: slotsConfig } = useQuery({
    queryKey: qk.checkout.subscriptionSlots,
    queryFn: getSubscriptionDeliverySlots,
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
  // Keyed by plan so a pick never leaks into another plan this page is
  // reused for; absent = untouched, i.e. the default first-N dates.
  const [picked, setPicked] = useState<{
    planId: string;
    dates: string[];
  } | null>(null);

  useEffect(() => {
    if (subscriptionsEnabled === false) router.replace("/");
  }, [subscriptionsEnabled, router]);

  // undefined = loading, null = logged out, [] = none saved.
  const addressesUnauthorized =
    addressesQuery.error instanceof ApiError &&
    addressesQuery.error.status === 401;
  const addresses: Address[] | null | undefined =
    addressesQuery.data ??
    (addressesQuery.isPending ? undefined : addressesUnauthorized ? null : []);
  // Derived, not stored: the customer's pick if it's still valid, otherwise
  // the default (or first) serviceable address.
  const serviceableAddresses = (addresses ?? []).filter((a) => a.serviceable);
  const selectedAddressId = serviceableAddresses.some(
    (a) => a.id === addressChoice,
  )
    ? addressChoice
    : ((
        serviceableAddresses.find((a) => a.isDefault) ?? serviceableAddresses[0]
      )?.id ?? "");

  const deliverySlots = slotsConfig?.slots ?? [];
  const hasActiveForThisPlan = Boolean(
    mySubscriptions?.some((s) => s.planId === id && s.status === "ACTIVE"),
  );
  const dateSelection = plan?.dateSelection ?? null;
  const chosenDates = dateSelection
    ? picked?.planId === id
      ? picked.dates
      : initialSelection(dateSelection.candidates, dateSelection.requiredCount)
    : null;
  const datesMissing = dateSelection
    ? dateSelection.requiredCount - (chosenDates?.length ?? 0)
    : 0;

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
    if (!plan || !selectedAddressId || datesMissing > 0 || pageSettings?.newSubscriptionsClosedReason) return;
    setIsSubscribing(true);
    try {
      const { subscriptionId, razorpayOrderId, razorpayKeyId, amountInPaise } =
        await subscribe({
          planId: plan.id,
          addressId: selectedAddressId,
          couponCode: couponCode || undefined,
          deliverySlotId: selectedSlotId || undefined,
          deliveryDates: chosenDates ?? undefined,
        });
      // A pending subscription now exists.
      void queryClient.invalidateQueries({ queryKey: qk.subscriptions.all });

      await loadRazorpayScript();
      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: amountInPaise,
        currency: "INR",
        order_id: razorpayOrderId,
        ...razorpayBranding(
          addresses?.find((a) => a.id === selectedAddressId)?.contactPhone,
        ),
        description: plan.name,
        handler: (response) => {
          verifySubscriptionPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              // Activation flips the subscription to ACTIVE and can schedule orders.
              void queryClient.invalidateQueries({
                queryKey: qk.subscriptions.all,
              });
              void queryClient.invalidateQueries({ queryKey: qk.orders.all });
              router.push(`/account/subscriptions/${subscriptionId}`);
            })
            .catch(() =>
              showToast(
                "Payment succeeded but activation failed — contact support.",
                "error",
              ),
            );
        },
        modal: {
          ondismiss: () => showToast("Payment cancelled.", "error"),
        },
      });
      razorpay.open();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Couldn't start subscription.",
        "error",
      );
    } finally {
      setIsSubscribing(false);
    }
  }

  if (!plan) {
    if (isPending) return <PlanDetailSkeleton calendar={pageSettings?.usesCalendar ?? layoutHint} />;
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

  const checkout = (
    <PlanPurchasePanel
      plan={plan}
      addresses={addresses}
      selectedAddressId={selectedAddressId}
      onAddressChange={setAddressChoice}
      deliverySlots={deliverySlots}
      selectedSlotId={selectedSlotId}
      onSlotChange={setSelectedSlotId}
      couponCode={couponCode}
      onCouponChange={setCouponCode}
      hasActiveForThisPlan={hasActiveForThisPlan}
      datesMissing={datesMissing}
      isSubscribing={isSubscribing}
      onSubscribeClick={handleSubscribeClick}
      closedReason={pageSettings?.newSubscriptionsClosedReason}
    />
  );

  return (
    // Bottom padding below lg leaves room for the pinned checkout bar.
    <main className="container-app flex-1 pt-8 pb-28 sm:pt-12 lg:pb-12">
      <h1 className="font-display text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-100">
        {plan.name}
      </h1>
      {plan.description && (
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          {plan.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {plan.durationDays} days
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" />
          Delivered daily to your address
        </span>
      </div>

      <div className="mt-6 sm:mt-8">
        {dateSelection && chosenDates ? (
          // The date picker is the plan's only calendar — it shows each
          // date's menu itself, so the menu view isn't repeated below it.
          <DeliveryDateSelector
            key={plan.id}
            plan={plan}
            dateSelection={dateSelection}
            selected={chosenDates}
            onChange={(dates) => setPicked({ planId: plan.id, dates })}
            checkout={checkout}
          />
        ) : (
          <PlanMenuView plan={plan} checkout={checkout} />
        )}
      </div>

      <PlanCheckoutBar
        plan={plan}
        datesPicked={chosenDates ? chosenDates.length : null}
      />
    </main>
  );
}
