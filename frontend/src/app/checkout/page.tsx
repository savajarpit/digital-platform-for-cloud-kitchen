"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, MapPin, Plus } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/lib/store/cart-store";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { ApiError, listAddresses, checkServiceability, type Address, type ServiceabilityResult } from "@/lib/api/addresses";
import { createOrder } from "@/lib/api/orders";
import { verifyPayment } from "@/lib/api/payments";
import { getOrderWindowStatus } from "@/lib/api/order-window";
import { getDeliverySlots, type DeliverySlot } from "@/lib/api/delivery-slots";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { AddressForm } from "@/components/addresses/AddressForm";
import { useToast } from "@/context/ToastContext";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { showToast } = useToast();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = useCartSubtotal();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [windowClosed, setWindowClosed] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [dayOptions, setDayOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
      return;
    }

    getOrderWindowStatus().then((status) => {
      if (!status.isAcceptingOrders) setWindowClosed(status.reason ?? "Not currently accepting orders");
    });

    getDeliverySlots().then((config) => {
      setSlots(config.slots);
      const days = Array.from({ length: config.maxAdvanceOrderDays + 1 }, (_, i) => {
        const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
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
      setSelectedSlotId(config.slots[0]?.id ?? "");
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

  const qualifiesForFreeDelivery = Boolean(
    serviceability?.freeDeliveryAboveAmountInPaise !== undefined &&
      subtotal >= serviceability.freeDeliveryAboveAmountInPaise,
  );
  const deliveryFeeInPaise = qualifiesForFreeDelivery ? 0 : (serviceability?.deliveryFeeInPaise ?? 0);
  const totalInPaise = subtotal + deliveryFeeInPaise;
  const belowMinOrder = Boolean(
    serviceability?.minOrderAmountInPaise && subtotal < serviceability.minOrderAmountInPaise,
  );

  async function handlePlaceOrder() {
    if (!selectedAddressId || !selectedDay || !selectedSlotId) return;
    setIsPlacingOrder(true);
    try {
      const { order, razorpayOrderId, razorpayKeyId } = await createOrder({
        addressId: selectedAddressId,
        items: items.map((i) => ({ mealId: i.mealId, quantity: i.quantity })),
        deliveryDate: selectedDay,
        deliverySlotId: selectedSlotId,
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

            {addresses === null ? null : addresses.length === 0 && !showAddressForm ? (
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
            {slots.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">{t("noSlots")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="deliveryDay" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("deliveryDay")}
                  </label>
                  <select
                    id="deliveryDay"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="input"
                  >
                    {dayOptions.length === 0 && <option value="">{t("selectDay")}</option>}
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="deliverySlot" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("deliverySlot")}
                  </label>
                  <select
                    id="deliverySlot"
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    className="input"
                  >
                    {!selectedSlotId && <option value="">{t("selectSlot")}</option>}
                    {slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.name} ({slot.startTime}–{slot.endTime})
                      </option>
                    ))}
                  </select>
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
          <div className="mt-4 flex flex-col gap-1 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPriceFromPaise(subtotal)}</span>
            </div>
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
              !selectedDay ||
              !selectedSlotId ||
              !agreedToTerms ||
              Boolean(windowClosed) ||
              belowMinOrder ||
              serviceability?.serviceable === false
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
