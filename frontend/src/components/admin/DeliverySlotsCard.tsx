"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import {
  ApiError,
  createDeliverySlot,
  deleteDeliverySlot,
  updateDeliverySlot,
  type DeliverySlot,
  type DeliverySlotUsage,
} from "@/lib/api/admin-settings";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useFeatures } from "@/context/FeaturesContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeInput12h } from "@/components/ui/TimeInput12h";
import { DeliverySlotRow } from "@/components/admin/DeliverySlotRow";
import { SlotUsagePicker } from "@/components/admin/SlotUsagePicker";

const EMPTY_SLOT = {
  name: "",
  startTime: "",
  endTime: "",
  usage: "BOTH" as DeliverySlotUsage,
};

const offersOrders = (s: DeliverySlot) =>
  s.isActive && s.usage !== "SUBSCRIPTIONS";
const offersSubscriptions = (s: DeliverySlot) =>
  s.isActive && s.usage !== "ORDERS";

/**
 * Settings › Delivery › Delivery slots: list (toggle, edit, delete) plus the
 * add row. With the subscriptions feature, each slot can be offered to
 * orders, subscriptions or both; a warning shows when a flow is left with no
 * active slot.
 */
export function DeliverySlotsCard({
  slots,
  canEdit,
  onChange,
}: {
  slots: DeliverySlot[];
  canEdit: boolean;
  onChange: (s: DeliverySlot[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { has: hasFeature } = useFeatures();
  const canSplit = hasFeature("subscriptions");
  const [newSlot, setNewSlot] = useState(EMPTY_SLOT);
  const [adding, setAdding] = useState(false);

  // Same rule the API enforces: a slot is a window within one day.
  const timesInverted = Boolean(
    newSlot.startTime &&
    newSlot.endTime &&
    newSlot.endTime <= newSlot.startTime,
  );
  const noOrderSlot = slots.length > 0 && !slots.some(offersOrders);
  const noSubscriptionSlot =
    canSplit && slots.length > 0 && !slots.some(offersSubscriptions);

  async function handleAdd() {
    if (!newSlot.name.trim() || !newSlot.startTime || !newSlot.endTime) return;
    setAdding(true);
    try {
      const created = await createDeliverySlot({
        name: newSlot.name,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        ...(canSplit ? { usage: newSlot.usage } : {}),
      });
      onChange([...slots, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewSlot(EMPTY_SLOT);
      showToast("Delivery slot added", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Couldn't add slot.",
        "error",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(slot: DeliverySlot) {
    try {
      const updated = await updateDeliverySlot(slot.id, {
        isActive: !slot.isActive,
      });
      onChange(slots.map((s) => (s.id === slot.id ? updated : s)));
      showToast(
        `Delivery slot ${updated.isActive ? "activated" : "deactivated"}`,
        "success",
      );
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Couldn't update slot.",
        "error",
      );
    }
  }

  function handleDelete(id: string) {
    confirm({
      message:
        "Remove this delivery slot? If subscriptions or upcoming orders still use it, you'll be asked to switch it off instead.",
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteDeliverySlot(id);
          onChange(slots.filter((s) => s.id !== id));
          showToast("Delivery slot removed", "success");
        } catch (err) {
          showToast(
            err instanceof ApiError ? err.message : "Couldn't remove slot.",
            "error",
          );
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Delivery slots
        </h3>
        {canSplit && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Each slot can be offered to orders, subscriptions or both — e.g. a
            fixed plan-route window apart from your wider order window.
          </p>
        )}
      </div>

      {noOrderSlot && (
        <SlotWarning>
          Orders have no active delivery slot — customers can only order instant
          delivery (if it&apos;s on).
        </SlotWarning>
      )}
      {noSubscriptionSlot && (
        <SlotWarning>
          Subscriptions have no active delivery slot — new subscribers
          can&apos;t pick a delivery time.
        </SlotWarning>
      )}

      <div className="flex flex-col gap-2">
        {slots.map((slot) => (
          <DeliverySlotRow
            key={slot.id}
            slot={slot}
            canEdit={canEdit}
            canSplit={canSplit}
            onToggleActive={() => handleToggleActive(slot)}
            onDelete={() => handleDelete(slot.id)}
            onSaved={(updated) =>
              onChange(slots.map((s) => (s.id === updated.id ? updated : s)))
            }
          />
        ))}
        {slots.length === 0 && (
          <EmptyState compact title="No delivery slots configured yet." />
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              type="text"
              value={newSlot.name}
              maxLength={40}
              onChange={(e) =>
                setNewSlot((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Lunch"
              className="input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Start
            </label>
            <TimeInput12h
              value={newSlot.startTime}
              onChange={(v) => setNewSlot((s) => ({ ...s, startTime: v }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              End
            </label>
            <TimeInput12h
              value={newSlot.endTime}
              onChange={(v) => setNewSlot((s) => ({ ...s, endTime: v }))}
            />
          </div>
          {canSplit && (
            <SlotUsagePicker
              value={newSlot.usage}
              onChange={(usage) => setNewSlot((s) => ({ ...s, usage }))}
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={
              adding ||
              !newSlot.name.trim() ||
              !newSlot.startTime ||
              !newSlot.endTime ||
              timesInverted
            }
            className="btn-outline btn-sm"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          {timesInverted && (
            <p className="w-full text-xs text-red-600 dark:text-red-400">
              The slot must end after it starts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SlotWarning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
