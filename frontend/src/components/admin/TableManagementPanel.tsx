"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createDiningTable,
  deleteDiningTable,
  updateDiningTable,
  type DiningTable,
} from "@/lib/api/dine-in";
import { useToast } from "@/context/ToastContext";

/** Table CRUD for one outlet — gated by dine-in.manage, separate from the
 * order-taking flow (dine-in.order-create) since a tenant may want a
 * manager to set up the floor without handing every waiter table-editing
 * rights. */
export function TableManagementPanel({
  kitchenZoneId,
  tables,
  onChanged,
}: {
  kitchenZoneId: string;
  tables: DiningTable[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      await createDiningTable({
        kitchenZoneId,
        label: label.trim(),
        capacity: capacity ? Number(capacity) : undefined,
      });
      setLabel("");
      setCapacity("");
      showToast("Table added", "success");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add this table.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(table: DiningTable) {
    try {
      await updateDiningTable(table.id, { isActive: !table.isActive });
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update this table.", "error");
    }
  }

  async function handleDelete(table: DiningTable) {
    if (table.activeOrderId) {
      showToast("This table has an active order — cannot remove it.", "error");
      return;
    }
    try {
      await deleteDiningTable(table.id);
      showToast("Table removed", "success");
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't remove this table.", "error");
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Manage Tables</h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Table name, e.g. Table 4"
          className="input w-40"
        />
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Seats"
          className="input w-20"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting || !label.trim()}
          className="btn-primary btn-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {tables.map((table) => (
          <div
            key={table.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {table.label}
              {table.capacity != null && (
                <span className="ml-1.5 font-normal text-zinc-400">· {table.capacity} seats</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleActive(table)}
                className="cursor-pointer text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {table.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(table)}
                className="rounded p-1 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {tables.length === 0 && <p className="text-xs text-zinc-400">No tables yet.</p>}
      </div>
    </div>
  );
}
