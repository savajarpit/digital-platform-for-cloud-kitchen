"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addOrderItems, assignOrderTable, listDiningTables, type DiningTable } from "@/lib/api/dine-in";
import { ApiError, type AdminOrderDetail } from "@/lib/api/admin-orders";
import { MealCombobox } from "@/components/admin/MealCombobox";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";

interface CartRow {
  mealId: string;
  quantity: number;
}

/** Embedded in the order detail page for a DINE_IN/TAKEAWAY order — lets
 * staff add another round of items to the still-open bill, and (DINE_IN
 * only) assign or move the table. Nothing here applies once the order is
 * closed (served/picked up or cancelled). */
export function DineInOrderPanel({
  order,
  onChanged,
}: {
  order: AdminOrderDetail;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const isOpen = order.status !== "DELIVERED" && order.status !== "CANCELLED";

  const [meals, setMeals] = useState<Meal[]>([]);
  const [cart, setCart] = useState<CartRow[]>([{ mealId: "", quantity: 1 }]);
  const [submittingItems, setSubmittingItems] = useState(false);

  const [tables, setTables] = useState<DiningTable[] | null>(null);
  const [tableId, setTableId] = useState(order.tableId ?? "");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    listMeals({ limit: 100 }).then(({ data }) => setMeals(data)).catch(() => setMeals([]));
  }, []);

  useEffect(() => {
    if (order.fulfillmentType !== "DINE_IN" || !order.dineInKitchenZone) return;
    listDiningTables(order.dineInKitchenZone.id).then(setTables).catch(() => setTables([]));
  }, [order.fulfillmentType, order.dineInKitchenZone]);

  function updateRow(index: number, patch: Partial<CartRow>) {
    setCart((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setCart((prev) => [...prev, { mealId: "", quantity: 1 }]);
  }

  function removeRow(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddItems() {
    const validRows = cart.filter((r) => r.mealId && r.quantity > 0);
    if (validRows.length === 0) return;
    setSubmittingItems(true);
    try {
      await addOrderItems(order.id, validRows.map((r) => ({ mealId: r.mealId, quantity: r.quantity })));
      setCart([{ mealId: "", quantity: 1 }]);
      showToast("Items added", "success");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add these items.", "error");
    } finally {
      setSubmittingItems(false);
    }
  }

  async function handleAssignTable() {
    if (!tableId) return;
    setAssigning(true);
    try {
      await assignOrderTable(order.id, tableId);
      showToast("Table updated", "success");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't assign this table.", "error");
    } finally {
      setAssigning(false);
    }
  }

  if (!isOpen) return null;

  // A table already seated elsewhere shouldn't disappear from this order's
  // own picker — only exclude tables occupied by a *different* order.
  const selectableTables = (tables ?? []).filter(
    (t) => t.isActive && (!t.activeOrderId || t.activeOrderId === order.id),
  );

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Items</h3>
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
      <div className="flex items-center gap-2">
        <button type="button" onClick={addRow} className="btn-ghost btn-sm cursor-pointer">
          <Plus className="h-4 w-4" />
          Add row
        </button>
        <button
          type="button"
          onClick={handleAddItems}
          disabled={submittingItems}
          className="btn-primary btn-sm cursor-pointer"
        >
          {submittingItems ? "Adding…" : "Add to Order"}
        </button>
      </div>

      {order.fulfillmentType === "DINE_IN" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Table</span>
          <Select value={tableId} onValueChange={setTableId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {selectableTables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleAssignTable}
            disabled={assigning || !tableId || tableId === order.tableId}
            className="btn-outline btn-sm cursor-pointer"
          >
            {assigning ? "Saving…" : "Save Table"}
          </button>
        </div>
      )}
    </div>
  );
}
