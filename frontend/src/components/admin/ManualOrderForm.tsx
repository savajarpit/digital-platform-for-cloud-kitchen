"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createManualOrder,
  type CreateManualOrderInput,
} from "@/lib/api/admin-orders";
import { getCustomer, type Customer, type CustomerAddress } from "@/lib/api/admin-customers";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { checkServiceability, type ServiceabilityResult } from "@/lib/api/addresses";
import { getDeliverySlots, type DeliverySlot } from "@/lib/api/delivery-slots";
import { CustomerCombobox } from "@/components/admin/CustomerCombobox";
import { MealCombobox } from "@/components/admin/MealCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";
import { formatPriceFromPaise } from "@/lib/format/currency";

interface CartRow {
  mealId: string;
  quantity: number;
}

export function ManualOrderForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [addressId, setAddressId] = useState("");
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [cart, setCart] = useState<CartRow[]>([{ mealId: "", quantity: 1 }]);

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliverySlotId, setDeliverySlotId] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMeals({ limit: 100 }).then(({ data }) => setMeals(data)).catch(() => setMeals([]));
    getDeliverySlots()
      .then((config) => {
        setSlots(config.slots);
        setDeliverySlotId(config.slots[0]?.id ?? "");
      })
      .catch(() => setSlots([]));
  }, []);

  // A customer switch is a discrete user action, not something to
  // synchronize via an effect — handled directly in the combobox's
  // onChange so the stale-previous-customer's addresses are cleared in the
  // same tick a new fetch starts, never left lingering for a render.
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

  useEffect(() => {
    // No address selected yet — nothing to fetch. Leaves any prior
    // serviceability result as-is, which is harmless: addressId is reset to
    // "" whenever the customer changes (see handleCustomerChange), and
    // canSubmit already requires a real addressId regardless.
    const address = addresses?.find((a) => a.id === addressId);
    if (!address) return;
    checkServiceability({
      pincode: address.pincode,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
    })
      .then(setServiceability)
      .catch(() => setServiceability(null));
  }, [addresses, addressId]);

  function updateRow(index: number, patch: Partial<CartRow>) {
    setCart((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setCart((prev) => [...prev, { mealId: "", quantity: 1 }]);
  }

  function removeRow(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const validRows = cart.filter((r) => r.mealId && r.quantity > 0);
  const subtotalInPaise = validRows.reduce((sum, row) => {
    const meal = meals.find((m) => m.id === row.mealId);
    return sum + (meal?.priceInPaise ?? 0) * row.quantity;
  }, 0);

  const canSubmit =
    Boolean(customer) && Boolean(addressId) && validRows.length > 0 && Boolean(deliverySlotId);

  async function handleSubmit() {
    if (!customer || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const input: CreateManualOrderInput = {
        customerUserId: customer.id,
        fulfillmentType: "DELIVERY",
        addressId,
        items: validRows.map((r) => ({ mealId: r.mealId, quantity: r.quantity })),
        deliveryDate,
        deliverySlotId,
        couponCode: couponCode.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        overrideServiceability: serviceability?.serviceable === false,
      };
      const { order } = await createManualOrder(input);
      showToast("Order created", "success");
      router.push(`/admin/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the order.");
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
            {serviceability?.serviceable === false && (
              <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                This address is outside the configured delivery area. You can still place this
                order — a manual order means you&apos;re vouching for it — but double-check with
                the customer first.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Items</h3>
        <div className="flex flex-col gap-2">
          {cart.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <MealCombobox
                  value={row.mealId}
                  onChange={(mealId) => updateRow(i, { mealId })}
                  knownMeals={meals}
                  noneLabel="Select a meal…"
                />
              </div>
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="input w-16 shrink-0 py-1.5 text-center"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={cart.length === 1}
                className="shrink-0 rounded p-1.5 text-zinc-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="btn-ghost btn-sm w-fit cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
        {subtotalInPaise > 0 && (
          <p className="border-t border-zinc-100 pt-3 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
            Subtotal: {formatPriceFromPaise(subtotalInPaise)}
          </p>
        )}
      </div>

      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Delivery date</label>
          <input
            type="date"
            value={deliveryDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Delivery slot</label>
          <Select value={deliverySlotId} onValueChange={setDeliverySlotId}>
            <SelectTrigger>
              <SelectValue />
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
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Payment method</label>
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
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="input w-full resize-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="btn-primary w-fit cursor-pointer"
      >
        {submitting ? "Creating…" : "Create Order"}
      </button>
    </div>
  );
}
