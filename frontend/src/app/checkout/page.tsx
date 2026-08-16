"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, MapPin, Plus, Zap } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/lib/store/cart-store";
import { useCartAvailability } from "@/lib/hooks/useCartAvailability";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { ApiError, listAddresses, checkServiceability, type Address, type ServiceabilityResult } from "@/lib/api/addresses";
import { createOrder, previewOrder } from "@/lib/api/orders";
import { verifyPayment } from "@/lib/api/payments";
import { getOrderWindowStatus } from "@/lib/api/order-window";
import {
  getDeliverySlots,
  getInstantDeliveryStatus,
  type DeliverySlot,
  type InstantDeliveryStatus,
} from "@/lib/api/delivery-slots";
import { formatTime12h, hhmmToMinutes } from "@/lib/format/time";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { AddressForm } from "@/components/addresses/AddressForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { showToast } = useToast();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartSubtotal();
  const { unavailableMealIds, loading: checkingAvailability } = useCartAvailability(items);
  const hasUnavailableItems = unavailableMealIds.size > 0;

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [windowClosed, setWindowClosed] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [slots, setSlots] = useState<DeliverySlot[] | null>(null);
  const [dayOptions, setDayOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [instantStatus, setInstantStatus] = useState<InstantDeliveryStatus | null>(null);
  const [isInstant, setIsInstant] = useState(false);
  const [todayStr, setTodayStr] = useState("");
  const [nowMinutes, setNowMinutes] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountInPaise: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
      return;
    }

    getOrderWindowStatus().then((status) => {
      if (!status.isAcceptingOrders) setWindowClosed(status.reason ?? "Not currently accepting orders");
    });

    // Auto-selected by default whenever it's actually available — the
    // customer can still switch to scheduling a later day/slot instead.
    getInstantDeliveryStatus()
      .then((status) => {
        setInstantStatus(status);
        setIsInstant(status.available);
      })
      .catch(() => setInstantStatus({ available: false, etaMinMinutes: 30, etaMaxMinutes: 45 }));

    getDeliverySlots().then((config) => {
      const now = new Date();
      setTodayStr(now.toISOString().slice(0, 10));
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
      setSlots(config.slots);

      const days = Array.from({ length: config.maxAdvanceOrderDays + 1 }, (_, i) => {
        const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const value = date.toISOString().slice(0, 10);
        const label =
          i === 0
            ? t("today")
            : i === 1
              ? t("tomorrow")
              : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        return { value, label };
      });
      setDayOptions(days);
      setSelectedDay(days[0]?.value ?? "");
    });

    listAddresses()
      .then((list) => {
        setAddresses(list);
        const defaultAddress = list.find((a) => a.isDefault) ?? list[0];
        if (defaultAddress) setSelectedAddressId(defaultAddress.id);
        if (list.length === 0) setShowAddressForm(true);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/checkout");
          return;
        }
        setAddresses([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A meal already in the cart can go unavailable (admin disables/deletes
  // it) between add-to-cart time and checkout — send the customer back to
  // the cart to resolve it rather than letting them attempt payment for an
  // item the backend will reject anyway.
  useEffect(() => {
    if (checkingAvailability || !hasUnavailableItems) return;
    showToast("Some items in your cart are no longer available.", "error");
    router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAvailability, hasUnavailableItems]);

  useEffect(() => {
    // No address selected yet — nothing to fetch. Leaves any prior
    // serviceability result as-is, which is harmless: selection only ever
    // comes from a rendered address in the list, so this branch is really
    // just the pre-load state, not a case that needs an explicit reset.
    const address = addresses?.find((a) => a.id === selectedAddressId);
    if (!address) return;
    checkServiceability({
      pincode: address.pincode,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
    }).then(setServiceability);
  }, [addresses, selectedAddressId]);

  // Hide slots that have already started when "today" is selected — the
  // slot dropdown should never offer something the backend will reject.
  const visibleSlots = useMemo(() => {
    if (!slots) return [];
    if (selectedDay !== todayStr) return slots;
    return slots.filter((slot) => hhmmToMinutes(slot.startTime) > nowMinutes);
  }, [slots, selectedDay, todayStr, nowMinutes]);

  // Derived, not stored: falls back to the first visible slot whenever the
  // user's last explicit pick isn't valid for the current day (e.g. they
  // picked Dinner, then switched back to a day where Dinner already
  // passed). Deriving during render avoids a setState-in-effect sync loop.
  const effectiveSlotId = visibleSlots.some((slot) => slot.id === selectedSlotId)
    ? selectedSlotId
    : (visibleSlots[0]?.id ?? "");

  const couponDiscountInPaise = appliedCoupon?.discountInPaise ?? 0;
  const effectiveSubtotal = Math.max(0, subtotal - couponDiscountInPaise);
  const qualifiesForFreeDelivery = Boolean(
    serviceability?.freeDeliveryAboveAmountInPaise !== undefined &&
      effectiveSubtotal >= serviceability.freeDeliveryAboveAmountInPaise,
  );
  const deliveryFeeInPaise = qualifiesForFreeDelivery ? 0 : (serviceability?.deliveryFeeInPaise ?? 0);
  const totalInPaise = effectiveSubtotal + deliveryFeeInPaise;
  const belowMinOrder = Boolean(
    serviceability?.minOrderAmountInPaise && subtotal < serviceability.minOrderAmountInPaise,
  );

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const preview = await previewOrder({
        items: items.map((i) => ({ mealId: i.mealId, quantity: i.quantity })),
        couponCode: code,
      });
      if (!preview.couponApplied) {
        setCouponError("Invalid coupon code");
        return;
      }
      setAppliedCoupon({ code: code.toUpperCase(), discountInPaise: preview.discountInPaise });
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
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) return;
    if (!isInstant && (!selectedDay || !effectiveSlotId)) return;
    setIsPlacingOrder(true);
    try {
      const { order, razorpayOrderId, razorpayKeyId } = await createOrder({
        addressId: selectedAddressId,
        items: items.map((i) => ({ mealId: i.mealId, quantity: i.quantity })),
        ...(isInstant
          ? { isInstant: true }
          : { deliveryDate: selectedDay, deliverySlotId: effectiveSlotId }),
        couponCode: appliedCoupon?.code,
      });

      await loadRazorpayScript();
      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.totalInPaise,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "Order payment",
        description: `Order ${order.orderNumber}`,
        handler: (response) => {
          verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              clearCart();
              router.push(`/orders/${order.id}`);
            })
            .catch(() => {
              showToast(t("paymentFailed"), "error");
            });
        },
        modal: {
          ondismiss: () => {
            showToast(t("paymentFailed"), "error");
          },
        },
      });
      razorpay.open();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <main className="container-app flex-1 py-10">
      <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      {windowClosed && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {windowClosed}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              {t("selectAddress")}
            </h2>

            {addresses === null ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <Skeleton className="mt-1 h-4 w-4 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-3.5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 && !showAddressForm ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("noAddresses")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      selectedAddressId === address.id
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-1 h-4 w-4 accent-primary-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary-600" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {address.label || address.city}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {address.line1}, {address.city}, {address.state} — {address.pincode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showAddressForm ? (
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <AddressForm
                  onSaved={(address) => {
                    setAddresses((prev) => [...(prev ?? []), address]);
                    setSelectedAddressId(address.id);
                    setShowAddressForm(false);
                  }}
                  onCancel={addresses && addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="btn-ghost mt-4 text-sm"
              >
                <Plus className="h-4 w-4" />
                {t("addAddress")}
              </button>
            )}

            {serviceability?.serviceable === false && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t("notServiceable")}</p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <Clock className="h-4 w-4 text-primary-600" />
              {t("deliverySlot")}
            </h2>

            {instantStatus?.available && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
                    isInstant
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={isInstant}
                    onChange={() => setIsInstant(true)}
                    className="h-4 w-4 accent-primary-600"
                  />
                  <Zap className="h-4 w-4 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t("instantDelivery")}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t("instantDeliveryEta", {
                        min: instantStatus.etaMinMinutes,
                        max: instantStatus.etaMaxMinutes,
                      })}
                    </p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
                    !isInstant
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={!isInstant}
                    onChange={() => setIsInstant(false)}
                    className="h-4 w-4 accent-primary-600"
                  />
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t("scheduleForLater")}
                  </p>
                </label>
              </div>
            )}

            {isInstant ? null : slots === null ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">{t("noSlots")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="deliveryDay" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("deliveryDay")}
                  </label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger id="deliveryDay">
                      <SelectValue placeholder={t("selectDay")} />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.length === 0 && <SelectItem value="">{t("selectDay")}</SelectItem>}
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="deliverySlot" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("deliverySlot")}
                  </label>
                  <Select value={effectiveSlotId} onValueChange={setSelectedSlotId}>
                    <SelectTrigger id="deliverySlot">
                      <SelectValue placeholder={t("selectSlot")} />
                    </SelectTrigger>
                    <SelectContent>
                      {!effectiveSlotId && <SelectItem value="">{t("selectSlot")}</SelectItem>}
                      {visibleSlots.map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.name} ({formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {visibleSlots.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("noSlotsToday")}</p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card p-6">
            <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary-600"
              />
              {t("agreeToTerms")}
            </label>
          </section>
        </div>

        <div className="card h-fit p-6">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">{t("orderSummary")}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <li key={item.mealId} className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPriceFromPaise(item.priceInPaise * item.quantity)}</span>
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
              {qualifiesForFreeDelivery ? (
                <span className="font-medium text-primary-600">{t("freeDelivery")}</span>
              ) : (
                <span>{formatPriceFromPaise(deliveryFeeInPaise)}</span>
              )}
            </div>
            <div className="mt-1 flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100">
              <span>Total</span>
              <span>{formatPriceFromPaise(totalInPaise)}</span>
            </div>
          </div>

          {belowMinOrder && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              Minimum order ₹{((serviceability?.minOrderAmountInPaise ?? 0) / 100).toFixed(0)} for
              this address.
            </p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={
              isPlacingOrder ||
              !selectedAddressId ||
              (!isInstant && (!selectedDay || !effectiveSlotId)) ||
              !agreedToTerms ||
              Boolean(windowClosed) ||
              belowMinOrder ||
              serviceability?.serviceable === false ||
              checkingAvailability ||
              hasUnavailableItems
            }
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
      </div>
    </main>
  );
}
