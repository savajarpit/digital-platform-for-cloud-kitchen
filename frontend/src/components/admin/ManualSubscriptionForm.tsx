"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createManualSubscription,
  listPlansAdmin,
  type CreateManualSubscriptionInput,
  type Plan,
} from "@/lib/api/admin-subscriptions";
import { getCustomer, type Customer, type CustomerAddress } from "@/lib/api/admin-customers";
import { getDeliverySlots, type DeliverySlot } from "@/lib/api/delivery-slots";
import { CustomerCombobox } from "@/components/admin/CustomerCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";
import { formatPriceFromPaise } from "@/lib/format/currency";

export function ManualSubscriptionForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [addressId, setAddressId] = useState("");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [deliverySlotId, setDeliverySlotId] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlansAdmin({ limit: 100 }).then(({ data }) => {
      const published = data.filter((p) => p.isPublished && p.isActive);
      setPlans(published);
      setPlanId(published[0]?.id ?? "");
    });
    getDeliverySlots()
      .then((config) => setSlots(config.slots))
      .catch(() => setSlots([]));
  }, []);

  function handleCustomerChange(next: Customer | null) {
    setCustomer(next);
    setAddresses(null);
    setAddressId("");
    if (!next) return;
    getCustomer(next.id)
      .then((detail) => {
        setAddresses(detail.addresses);
        setAddressId(detail.addresses.find((a) => a.isDefault)?.id ?? detail.addresses[0]?.id ?? "");
      })
      .catch(() => setAddresses([]));
  }

  const selectedPlan = plans.find((p) => p.id === planId);
  const canSubmit = Boolean(customer) && Boolean(addressId) && Boolean(planId);

  async function handleSubmit() {
    if (!customer || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const input: CreateManualSubscriptionInput = {
        customerUserId: customer.id,
        planId,
        addressId,
        deliverySlotId: deliverySlotId || undefined,
        couponCode: couponCode.trim() || undefined,
        paymentMethod,
      };
      const { subscription } = await createManualSubscription(input);
      showToast("Subscription created", "success");
      router.push(`/admin/subscriptions/${subscription.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the subscription.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="card flex flex-col gap-3 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Customer</h3>
        <CustomerCombobox value={customer} onChange={handleCustomerChange} />

        {customer && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Delivery address
            </label>
            {!addresses ? (
              <p className="text-xs text-zinc-400">Loading addresses…</p>
            ) : addresses.length === 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                This customer has no saved addresses yet.
              </p>
            ) : (
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label ? `${a.label} — ` : ""}
                      {a.line1}, {a.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-4 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Plan</h3>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {formatPriceFromPaise(p.priceInPaise)} / {p.durationDays} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {plans.length === 0 && (
          <p className="text-xs text-zinc-400">No published plans available.</p>
        )}

        {slots.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Default delivery slot (optional)
            </label>
            <Select value={deliverySlotId} onValueChange={setDeliverySlotId}>
              <SelectTrigger>
                <SelectValue placeholder="No default — decide per day" />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Coupon code (optional)
            </label>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Payment method
            </label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "CASH" | "UPI")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedPlan && (
          <p className="border-t border-zinc-100 pt-3 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            Total: {formatPriceFromPaise(selectedPlan.priceInPaise)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="btn-primary w-fit cursor-pointer"
      >
        {submitting ? "Creating…" : "Create Subscription"}
      </button>
    </div>
  );
}
