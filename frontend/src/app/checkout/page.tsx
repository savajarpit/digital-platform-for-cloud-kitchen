"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/lib/store/cart-store";
import { useCartAvailability } from "@/lib/hooks/useCartAvailability";
import { useCheckoutData } from "@/lib/hooks/useCheckoutData";
import { useCartStock } from "@/lib/hooks/useCartStock";
import { ApiError, checkServiceability } from "@/lib/api/addresses";
import { createOrder } from "@/lib/api/orders";
import { verifyPayment } from "@/lib/api/payments";
import { qk } from "@/lib/query/keys";
import { useAddresses, useAddressCacheSync } from "@/lib/query/addresses";
import { buildGoogleMapsLink } from "@/lib/format/maps-link";
import { hhmmToMinutes } from "@/lib/format/time";
import { runCheckoutPreflight } from "@/lib/checkout/preflight";
import { useRazorpayBranding } from "@/lib/razorpay/useRazorpayBranding";
import { loadRazorpayScript } from "@/lib/razorpay/load-checkout-script";
import { PaymentConfirmingScreen } from "@/components/checkout/PaymentConfirmingScreen";
import { CheckoutSkeleton } from "@/components/checkout/CheckoutSkeleton";
import { CheckoutAddressSection } from "@/components/checkout/CheckoutAddressSection";
import { CheckoutSlotSection } from "@/components/checkout/CheckoutSlotSection";
import { CheckoutStockNotice } from "@/components/checkout/CheckoutStockNotice";
import { CheckoutSummaryCard, type AppliedCoupon } from "@/components/checkout/CheckoutSummaryCard";
import { useToast } from "@/context/ToastContext";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const updateItemAddons = useCartStore((s) => s.updateItemAddons);
  const subtotal = useCartSubtotal();
  const { unavailableMealIds, loading: checkingAvailability } = useCartAvailability(items);
  const hasUnavailableItems = unavailableMealIds.size > 0;

  // Public settings (order window, pickup, instant delivery, slots) — cached,
  // so a return visit paints instantly and refreshes quietly behind it.
  const { windowClosed, closedNowNote, pickupInfo, instantStatus, slots, dayOptions, todayStr, nowMinutes } =
    useCheckoutData({ today: t("today"), tomorrow: t("tomorrow") });
  const razorpayBranding = useRazorpayBranding();

  const { data: addressList, isPending: addressesPending, error: addressesError } = useAddresses();
  const { afterSave: cacheSavedAddress } = useAddressCacheSync();
  const addressesUnauthorized = addressesError instanceof ApiError && addressesError.status === 401;
  // null = still loading (or redirecting to login); a failed load shows the
  // empty state + add-address form, like before.
  const addresses = addressList ?? (addressesPending || addressesUnauthorized ? null : []);

  // User choices. Anything with a sensible default (address, pickup zone,
  // instant delivery, day, slot) is stored as an optional override and
  // resolved during render — no setState-in-effect syncing.
  const [addressChoice, setAddressChoice] = useState<string | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [zoneChoice, setZoneChoice] = useState<string | null>(null);
  const [instantChoice, setInstantChoice] = useState<boolean | null>(null);
  const [dayChoice, setDayChoice] = useState("");
  const [slotChoice, setSlotChoice] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // True from the moment Razorpay reports success until the order-page
  // redirect commits — keeps the page from flashing blank in that gap
  // (clearCart() empties the cart, so the normal render path would bail).
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Empty cart on arrival: nothing to check out. Mount-only on purpose — a
  // successful payment clears the cart and navigates to the order itself.
  // Reads the store directly once persist has rehydrated: during hydration
  // `items` is still the server snapshot (always empty), so trusting it sent
  // every direct /checkout visit to /cart even with a full cart.
  useEffect(() => {
    const redirectIfEmpty = () => {
      if (useCartStore.getState().items.length === 0) router.replace("/cart");
    };
    if (useCartStore.persist.hasHydrated()) {
      redirectIfEmpty();
      return;
    }
    return useCartStore.persist.onFinishHydration(redirectIfEmpty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (addressesUnauthorized) router.push("/login?redirect=/checkout");
  }, [addressesUnauthorized, router]);

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

  // Never auto-select an address the tenant no longer delivers to — prefer
  // the customer's pick, else the default/first one that's still serviceable,
  // matching what the picker itself allows them to click.
  const serviceableAddresses = (addresses ?? []).filter((a) => a.serviceable);
  const selectedAddressId =
    (serviceableAddresses.some((a) => a.id === addressChoice)
      ? addressChoice
      : (serviceableAddresses.find((a) => a.isDefault) ?? serviceableAddresses[0])?.id) ?? null;
  const showAddressForm = addressFormOpen || addresses?.length === 0;

  const isPickup = fulfillmentType === "PICKUP";
  const zones = pickupInfo?.zones;
  const selectedZoneId = zones?.some((z) => z.id === zoneChoice) ? (zoneChoice ?? "") : (zones?.[0]?.id ?? "");
  // Instant delivery is the default whenever it's actually available — the
  // customer can still switch to scheduling a later day/slot instead.
  const isInstant = !isPickup && Boolean(instantStatus?.available) && (instantChoice ?? true);
  // A holiday is listed but never picked — including as the default.
  const openDays = dayOptions.filter((d) => d.closedName === undefined);
  const selectedDay = openDays.some((d) => d.value === dayChoice) ? dayChoice : (openDays[0]?.value ?? "");

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);
  const { data: serviceability = null } = useQuery({
    queryKey: qk.addresses.serviceability(
      selectedAddress?.pincode ?? "",
      selectedAddress?.lat ?? null,
      selectedAddress?.lng ?? null,
    ),
    queryFn: () =>
      checkServiceability({
        pincode: selectedAddress!.pincode,
        lat: selectedAddress!.lat ?? undefined,
        lng: selectedAddress!.lng ?? undefined,
      }),
    enabled: Boolean(selectedAddress),
    // Gate data: a tenant can shrink the delivery area while this page is open.
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Switching address keeps showing the last result instead of blanking.
    placeholderData: keepPreviousData,
  });

  // Hide slots that have already started when "today" is selected — the
  // slot dropdown should never offer something the backend will reject.
  const visibleSlots = useMemo(() => {
    if (!slots) return [];
    if (selectedDay !== todayStr) return slots;
    return slots.filter((slot) => hhmmToMinutes(slot.startTime) > nowMinutes);
  }, [slots, selectedDay, todayStr, nowMinutes]);

  // Derived, not stored: falls back to the first visible slot whenever the
  // user's last explicit pick isn't valid for the current day (e.g. they
  // picked Dinner, then switched back to a day where Dinner already passed).
  const effectiveSlotId = visibleSlots.some((slot) => slot.id === slotChoice)
    ? slotChoice
    : (visibleSlots[0]?.id ?? "");

  // Daily stock is per delivery date: instant orders draw on today's.
  const stockDate = isInstant ? todayStr : selectedDay;
  const stockShortfalls = useCartStock(items, stockDate || null);

  const couponDiscountInPaise = appliedCoupon?.discountInPaise ?? 0;
  const effectiveSubtotal = Math.max(0, subtotal - couponDiscountInPaise);
  const qualifiesForFreeDelivery = Boolean(
    serviceability?.freeDeliveryAboveAmountInPaise !== undefined &&
      effectiveSubtotal >= serviceability.freeDeliveryAboveAmountInPaise,
  );
  const deliveryFeeInPaise = isPickup
    ? 0
    : qualifiesForFreeDelivery
      ? 0
      : (serviceability?.deliveryFeeInPaise ?? 0);
  const totalInPaise = effectiveSubtotal + deliveryFeeInPaise;
  const belowMinOrder = Boolean(
    !isPickup && serviceability?.minOrderAmountInPaise && subtotal < serviceability.minOrderAmountInPaise,
  );

  async function handlePlaceOrder() {
    if (isPickup ? !selectedZoneId : !selectedAddressId) return;
    if (!isInstant && (!selectedDay || !effectiveSlotId)) return;
    setIsPlacingOrder(true);
    try {
      // Re-verify the gates against fresh data the moment the customer commits
      // (store open, items + add-ons still offered, address still serviceable).
      const check = await runCheckoutPreflight({
        queryClient,
        items,
        isPickup,
        address: selectedAddress,
        schedule: isInstant ? "instant" : { date: selectedDay },
        stockDate,
      });
      if (!check.ok) {
        for (const p of check.prune ?? []) updateItemAddons(p.lineKey, p.addons);
        showToast(check.message, "error");
        if (check.goToCart) router.replace("/cart");
        return;
      }

      const { order, razorpayOrderId, razorpayKeyId } = await createOrder({
        fulfillmentType,
        ...(isPickup ? { pickupKitchenZoneId: selectedZoneId } : { addressId: selectedAddressId! }),
        items: items.map((i) => ({
          mealId: i.mealId,
          quantity: i.quantity,
          addons: i.addons?.map((a) => ({ addonItemId: a.addonItemId, quantity: a.quantity })),
        })),
        ...(isInstant
          ? { isInstant: true }
          : { deliveryDate: selectedDay, deliverySlotId: effectiveSlotId }),
        couponCode: appliedCoupon?.code,
        notes: deliveryNotes.trim() || undefined,
        prepNotes: prepNotes.trim() || undefined,
      });
      // The order now exists (pending payment) — any cached list is stale.
      void queryClient.invalidateQueries({ queryKey: qk.orders.all });

      await loadRazorpayScript();
      // Local flag (not React state) so `ondismiss`'s closure reads the
      // current value — Razorpay fires ondismiss right after a successful
      // handler too, and a stale state read there would flash a bogus
      // "payment failed" toast over the redirect.
      let paymentSucceeded = false;
      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.totalInPaise,
        currency: "INR",
        order_id: razorpayOrderId,
        ...razorpayBranding(selectedAddress?.contactPhone),
        description: `Order ${order.orderNumber}`,
        handler: (response) => {
          paymentSucceeded = true;
          setIsConfirmingPayment(true);
          verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              // Payment flips the order to CONFIRMED; the order page and the
              // orders list must not show the pending copy.
              void queryClient.invalidateQueries({ queryKey: qk.orders.all });
              clearCart();
              router.replace(`/orders/${order.id}`);
            })
            // Razorpay only calls the handler for a captured payment, so the
            // customer has paid: never say otherwise or keep the cart (they'd
            // pay twice). The payment check job confirms the order shortly.
            .catch(() => {
              void queryClient.invalidateQueries({ queryKey: qk.orders.all });
              clearCart();
              showToast(t("paymentConfirming"), "info");
              router.replace(`/orders/${order.id}`);
            });
        },
        modal: {
          ondismiss: () => {
            if (!paymentSucceeded) showToast(t("paymentFailed"), "error");
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

  // Payment done — hold this screen until the order-page navigation takes
  // over. Checked before the empty-cart shell below, since clearCart() runs
  // first and would otherwise flash the skeleton for a beat.
  if (isConfirmingPayment) return <PaymentConfirmingScreen />;

  // Empty cart: the mount effect is already redirecting to /cart. Hold the
  // page's own shape meanwhile instead of rendering nothing.
  if (items.length === 0) return <CheckoutSkeleton />;

  return (
    <main className="container-app flex-1 py-10">
      <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("title")}</h1>

      {windowClosed && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {windowClosed}
        </div>
      )}
      {closedNowNote && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {closedNowNote}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {pickupInfo?.available && (
            <section className="card p-6">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">How would you like this?</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
                    !isPickup
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillmentType"
                    checked={!isPickup}
                    onChange={() => setFulfillmentType("DELIVERY")}
                    className="h-4 w-4 accent-primary-600"
                  />
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delivery</p>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
                    isPickup
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillmentType"
                    checked={isPickup}
                    onChange={() => {
                      setFulfillmentType("PICKUP");
                      setInstantChoice(false);
                    }}
                    className="h-4 w-4 accent-primary-600"
                  />
                  <MapPin className="h-4 w-4 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Pickup</p>
                </label>
              </div>
            </section>
          )}

          {isPickup ? (
            <section className="card p-6">
              <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">Choose a pickup location</h2>
              <div className="flex flex-col gap-3">
                {pickupInfo?.zones.map((zone) => (
                  <label
                    key={zone.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      selectedZoneId === zone.id
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickupZone"
                      checked={selectedZoneId === zone.id}
                      onChange={() => setZoneChoice(zone.id)}
                      className="mt-1 h-4 w-4 accent-primary-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="wrap-break-word text-sm text-zinc-600 dark:text-zinc-400">
                        {zone.pickupAddress}
                      </p>
                      <a
                        href={buildGoogleMapsLink(zone.lat, zone.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Get directions
                      </a>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          ) : (
            <CheckoutAddressSection
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelect={setAddressChoice}
              showForm={showAddressForm}
              onShowForm={() => setAddressFormOpen(true)}
              onHideForm={() => setAddressFormOpen(false)}
              onSaved={(address) => {
                cacheSavedAddress(address);
                setAddressChoice(address.id);
                setAddressFormOpen(false);
              }}
              serviceability={serviceability}
            />
          )}

          <CheckoutSlotSection
            isPickup={isPickup}
            instantStatus={instantStatus}
            isInstant={isInstant}
            onInstantChange={setInstantChoice}
            slots={slots}
            visibleSlots={visibleSlots}
            dayOptions={dayOptions}
            selectedDay={selectedDay}
            onDayChange={setDayChoice}
            effectiveSlotId={effectiveSlotId}
            onSlotChange={setSlotChoice}
          />

          <CheckoutStockNotice shortfalls={stockShortfalls} date={stockDate} />

          <section className="card flex flex-col gap-4 p-6">
            <div>
              <label htmlFor="prepNotes" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("prepNotes")}
              </label>
              <textarea
                id="prepNotes"
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="No onions, extra spicy…"
                className="input w-full resize-none"
              />
            </div>
            <div>
              <label htmlFor="orderNotes" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("orderNotes")}
              </label>
              <textarea
                id="orderNotes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Ring the bell twice, leave at the door…"
                className="input w-full resize-none"
              />
            </div>
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

        <CheckoutSummaryCard
          items={items}
          subtotal={subtotal}
          appliedCoupon={appliedCoupon}
          onCouponApplied={setAppliedCoupon}
          onCouponRemoved={() => setAppliedCoupon(null)}
          isPickup={isPickup}
          qualifiesForFreeDelivery={qualifiesForFreeDelivery}
          deliveryFeeInPaise={deliveryFeeInPaise}
          totalInPaise={totalInPaise}
          minOrderInPaise={belowMinOrder ? (serviceability?.minOrderAmountInPaise ?? 0) : null}
          isPlacingOrder={isPlacingOrder}
          onPlaceOrder={handlePlaceOrder}
          placeDisabled={
            isPlacingOrder ||
            (isPickup ? !selectedZoneId : !selectedAddressId) ||
            (!isInstant && (!selectedDay || !effectiveSlotId)) ||
            !agreedToTerms ||
            Boolean(windowClosed) ||
            belowMinOrder ||
            (!isPickup && serviceability?.serviceable === false) ||
            checkingAvailability ||
            hasUnavailableItems ||
            stockShortfalls.length > 0
          }
        />
      </div>
    </main>
  );
}
