"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError, createDineInOrder, type DiningTable } from "@/lib/api/dine-in";
import type { AdminOrderDetail } from "@/lib/api/admin-orders";
import { CustomerCombobox } from "@/components/admin/CustomerCombobox";
import { MealCombobox } from "@/components/admin/MealCombobox";
import type { Customer } from "@/lib/api/admin-customers";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";
import { formatPriceFromPaise } from "@/lib/format/currency";

interface CartRow {
  mealId: string;
  quantity: number;
}

/**
 * Minimal-click counter order — mirrors a real POS: every guest field is
 * optional, items can be left empty and added later, and a table is only
 * asked for when the type is DINE_IN. Deliberately not a dedicated /new
 * route (unlike the phone-order form) since speed at the counter is the
 * whole point.
 */
export function NewDineInOrderForm({
  kitchenZoneId,
  freeTables,
  defaultTableId,
  onCreated,
  onCancel,
}: {
  kitchenZoneId: string;
  freeTables: DiningTable[];
  /** Pre-fills and locks the table when opened by tapping a specific free
   * table on the grid — otherwise staff picks (or skips) one. */
  defaultTableId?: string;
  onCreated: (order: AdminOrderDetail) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [fulfillmentType, setFulfillmentType] = useState<"DINE_IN" | "TAKEAWAY">(
    defaultTableId ? "DINE_IN" : "TAKEAWAY",
  );
  const [tableId, setTableId] = useState(defaultTableId ?? "");
  const [linkCustomer, setLinkCustomer] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ensureMealsLoaded() {
    if (mealsLoaded) return;
    setMealsLoaded(true);
    listMeals({ limit: 100 })
      .then(({ data }) => setMeals(data))
      .catch(() => setMeals([]));
  }

  function addRow() {
    ensureMealsLoaded();
    setCart((prev) => [...prev, { mealId: "", quantity: 1 }]);
  }

  function updateRow(index: number, patch: Partial<CartRow>) {
    setCart((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const validRows = cart.filter((r) => r.mealId && r.quantity > 0);
  const subtotalInPaise = validRows.reduce((sum, row) => {
    const meal = meals.find((m) => m.id === row.mealId);
    return sum + (meal?.priceInPaise ?? 0) * row.quantity;
  }, 0);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const order = await createDineInOrder({
        kitchenZoneId,
        fulfillmentType,
        tableId: fulfillmentType === "DINE_IN" && tableId ? tableId : undefined,
        customerUserId: linkCustomer && customer ? customer.id : undefined,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        items: validRows.map((r) => ({ mealId: r.mealId, quantity: r.quantity })),
        notes: notes.trim() || undefined,
      });
      showToast("Order opened", "success");
      onCreated(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open this order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!defaultTableId && (
          <Select
            value={fulfillmentType}
            onValueChange={(v) => setFulfillmentType(v as "DINE_IN" | "TAKEAWAY")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
              <SelectItem value="DINE_IN">Dine-in</SelectItem>
            </SelectContent>
          </Select>
        )}

        {fulfillmentType === "DINE_IN" && !defaultTableId && (
          <Select value={tableId} onValueChange={setTableId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Assign later" />
            </SelectTrigger>
            <SelectContent>
              {freeTables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {defaultTableId && (
          <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            {freeTables.find((t) => t.id === defaultTableId)?.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLinkCustomer((v) => !v)}
            className="cursor-pointer text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {linkCustomer ? "Enter guest details instead" : "Link an existing customer instead"}
          </button>
        </div>
        {linkCustomer ? (
          <CustomerCombobox value={customer} onChange={setCustomer} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name (optional)"
              className="input"
            />
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="input"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
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
                className="shrink-0 rounded p-1.5 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="btn-ghost btn-sm w-fit cursor-pointer">
          <Plus className="h-4 w-4" />
          Add item
        </button>
        {subtotalInPaise > 0 && (
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Subtotal: {formatPriceFromPaise(subtotalInPaise)}
          </p>
        )}
        <p className="text-xs text-zinc-400">Items can be left empty — add rounds later once seated.</p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Notes (optional)"
        className="input w-full resize-none"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary btn-sm cursor-pointer"
        >
          {submitting ? "Opening…" : "Open Order"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
}
