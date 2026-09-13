"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createAddonGroup,
  createAddonItem,
  deleteAddonGroup,
  deleteAddonItem,
  updateAddonGroup,
  updateAddonItem,
  type AddonGroup,
} from "@/lib/api/addons";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { formatPriceFromPaise } from "@/lib/format/currency";

/** Plain-English restatement of the min/max numbers — this is the exact
 * confusion point tenants hit ("I added 3 items but customers can only
 * pick 1?"): the numbers cap how many *different* items get combined, not
 * how many items exist in the group. */
function describeSelectionRule(min: number, max: number): string {
  if (min === 0 && max === 1) return "Customers can pick at most 1 of the items below (or skip it).";
  if (min === 1 && max === 1) return "Customers must pick exactly 1 of the items below.";
  if (min === 0) return `Customers can pick up to ${max} of the items below (or skip it).`;
  if (min === max) return `Customers must pick exactly ${min} of the items below.`;
  return `Customers must pick between ${min} and ${max} of the items below.`;
}

/** Admin library of reusable add-on groups (e.g. "Roti Extras") and their
 * items (e.g. "Extra Roti") — never a meal itself, never shown to a
 * customer on its own. Attaching a group to specific meals happens in
 * MealForm, not here. */
export function AddonGroupsCard({
  groups,
  canEdit,
  onChange,
}: {
  groups: AddonGroup[];
  canEdit: boolean;
  onChange: (groups: AddonGroup[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [minSelections, setMinSelections] = useState("0");
  const [maxSelections, setMaxSelections] = useState("1");
  const [adding, setAdding] = useState(false);

  async function handleAddGroup() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const created = await createAddonGroup({
        name: name.trim(),
        minSelections: Number(minSelections) || 0,
        maxSelections: Number(maxSelections) || 1,
      });
      onChange([...groups, { ...created, items: [] }]);
      setName("");
      setMinSelections("0");
      setMaxSelections("1");
      showToast("Add-on group created", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't create this group.", "error");
    } finally {
      setAdding(false);
    }
  }

  function handleDeleteGroup(group: AddonGroup) {
    confirm({
      message: `Delete "${group.name}"? This removes it (and its items) from every meal it's attached to.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteAddonGroup(group.id);
          onChange(groups.filter((g) => g.id !== group.id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete this group.", "error");
        }
      },
    });
  }

  async function handleToggleGroupActive(group: AddonGroup) {
    try {
      const updated = await updateAddonGroup(group.id, { isActive: !group.isActive });
      onChange(groups.map((g) => (g.id === group.id ? { ...g, ...updated } : g)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update this group.", "error");
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-on Groups</h3>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setExpandedId((id) => (id === group.id ? null : group.id))}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {group.name}
                </span>
                <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  pick {group.minSelections}–{group.maxSelections}
                </span>
                <span className="text-xs text-zinc-400">{group.items.length} item(s)</span>
              </div>
              {expandedId === group.id ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
              )}
            </button>

            {expandedId === group.id && (
              <div className="flex flex-col gap-3 border-t border-zinc-100 p-3.5 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">
                  {describeSelectionRule(group.minSelections, group.maxSelections)}
                </p>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <Toggle
                      checked={group.isActive}
                      onChange={() => handleToggleGroupActive(group)}
                      disabled={!canEdit}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    disabled={!canEdit}
                    className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <AddonItemsList
                  group={group}
                  canEdit={canEdit}
                  onChange={(items) =>
                    onChange(groups.map((g) => (g.id === group.id ? { ...g, items } : g)))
                  }
                />
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No add-on groups yet.</p>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Group name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Roti Extras"
                className="input w-44"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Minimum picks required
              </label>
              <input
                type="number"
                min={0}
                value={minSelections}
                onChange={(e) => setMinSelections(e.target.value)}
                className="input w-24"
                title="0 = entirely optional; 1+ forces a choice before checkout"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Maximum picks allowed
              </label>
              <input
                type="number"
                min={1}
                value={maxSelections}
                onChange={(e) => setMaxSelections(e.target.value)}
                className="input w-24"
                title="How many different items below a customer can combine at once — not how many items you add below"
              />
            </div>
            <button
              type="button"
              onClick={handleAddGroup}
              disabled={adding || !name.trim()}
              className="btn-outline btn-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Group
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            {describeSelectionRule(Number(minSelections) || 0, Number(maxSelections) || 1)} You can
            add as many items to this group as you like below — these two numbers only control how
            many of them a customer combines at once.
          </p>
        </div>
      )}
    </div>
  );
}

function AddonItemsList({
  group,
  canEdit,
  onChange,
}: {
  group: AddonGroup;
  canEdit: boolean;
  onChange: (items: AddonGroup["items"]) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("1");
  const [adding, setAdding] = useState(false);

  async function handleAddItem() {
    if (!name.trim() || !priceRupees) return;
    setAdding(true);
    try {
      const created = await createAddonItem({
        addonGroupId: group.id,
        name: name.trim(),
        priceInPaise: Math.round(Number(priceRupees) * 100),
        maxQuantityPerOrder: Number(maxQuantity) || 1,
      });
      onChange([...group.items, created]);
      setName("");
      setPriceRupees("");
      setMaxQuantity("1");
      showToast("Add-on item created", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't create this item.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleAvailable(itemId: string, isAvailable: boolean) {
    try {
      const updated = await updateAddonItem(itemId, { isAvailable: !isAvailable });
      onChange(group.items.map((i) => (i.id === itemId ? { ...i, ...updated } : i)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update this item.", "error");
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteAddonItem(itemId);
      onChange(group.items.filter((i) => i.id !== itemId));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete this item.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {group.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
        >
          <div>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</span>
            <span className="ml-2 text-zinc-500 dark:text-zinc-400">
              {formatPriceFromPaise(item.priceInPaise)} · max {item.maxQuantityPerOrder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={item.isAvailable}
              onChange={() => handleToggleAvailable(item.id, item.isAvailable)}
              disabled={!canEdit}
            />
            <span className="w-16 text-xs text-zinc-400">
              {item.isAvailable ? "In stock" : "Out of stock"}
            </span>
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              disabled={!canEdit}
              className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Extra Roti"
            className="input w-36 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            placeholder="Price (₹)"
            className="input w-24 py-1.5 text-sm"
          />
          <input
            type="number"
            min={1}
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            placeholder="Max qty"
            title="Max quantity per order — >1 shows a +/- stepper to the customer"
            className="input w-20 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={adding || !name.trim() || !priceRupees}
            className="btn-ghost btn-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      )}
    </div>
  );
}
