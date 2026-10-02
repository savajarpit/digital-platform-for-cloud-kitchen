"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import {
  ApiError,
  updateDeliverySlot,
  type DeliverySlot,
} from "@/lib/api/admin-settings";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { TimeInput12h } from "@/components/ui/TimeInput12h";
import { formatTime12h } from "@/lib/format/time";
import {
  SlotUsagePicker,
  slotUsageLabel,
} from "@/components/admin/SlotUsagePicker";

/**
 * One delivery slot on Settings › Delivery: name and window, an on/off
 * switch, delete, and an inline edit. Placed orders keep the slot name and
 * window they were snapshotted with, so editing only moves subscribers'
 * upcoming deliveries — the confirm says so before a time change is saved.
 * "Used for" (orders / subscriptions / both) is editable only while the
 * tenant has subscriptions; a split slot keeps its label either way.
 */
export function DeliverySlotRow({
  slot,
  canEdit,
  canSplit,
  onToggleActive,
  onDelete,
  onSaved,
}: {
  slot: DeliverySlot;
  canEdit: boolean;
  /** The tenant has subscriptions, so slots can be split by flow. */
  canSplit: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
  onSaved: (updated: DeliverySlot) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    usage: slot.usage,
  });
  const [saving, setSaving] = useState(false);

  const timesInverted = draft.endTime <= draft.startTime;
  const timesChanged =
    draft.startTime !== slot.startTime || draft.endTime !== slot.endTime;
  const unchanged =
    draft.name.trim() === slot.name &&
    !timesChanged &&
    draft.usage === slot.usage;
  const usageLabel = slotUsageLabel(slot.usage);

  function startEditing() {
    setDraft({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      usage: slot.usage,
    });
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await updateDeliverySlot(slot.id, {
        name: draft.name.trim(),
        startTime: draft.startTime,
        endTime: draft.endTime,
        ...(canSplit && draft.usage !== slot.usage
          ? { usage: draft.usage }
          : {}),
      });
      onSaved(updated);
      setEditing(false);
      showToast("Delivery slot updated", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Couldn't update slot.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (!timesChanged) {
      void save();
      return;
    }
    confirm({
      title: "Change this slot's time?",
      message: `${slot.name} becomes ${formatTime12h(draft.startTime)}–${formatTime12h(draft.endTime)}. Subscribers on this slot get the new time from their next delivery. Orders already placed keep their time.`,
      confirmLabel: "Save new time",
      processingLabel: "Saving…",
      onConfirm: save,
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary-200 px-3.5 py-3 dark:border-primary-900">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              type="text"
              value={draft.name}
              maxLength={40}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              className="input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Start
            </label>
            <TimeInput12h
              value={draft.startTime}
              onChange={(v) => setDraft((d) => ({ ...d, startTime: v }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              End
            </label>
            <TimeInput12h
              value={draft.endTime}
              onChange={(v) => setDraft((d) => ({ ...d, endTime: v }))}
            />
          </div>
        </div>
        {canSplit && (
          <SlotUsagePicker
            value={draft.usage}
            onChange={(usage) => setDraft((d) => ({ ...d, usage }))}
          />
        )}
        {timesInverted && (
          <p className="text-xs text-red-600 dark:text-red-400">
            The slot must end after it starts.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="btn-ghost btn-sm cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving || unchanged || timesInverted || !draft.name.trim()
            }
            className="btn-primary btn-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800">
      <div>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {slot.name}
        </span>
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)}
        </span>
        {usageLabel && (
          <span
            className={`badge ml-2 ${
              canSplit
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {usageLabel}
            {!canSplit && " — feature off"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Toggle
          checked={slot.isActive}
          onChange={onToggleActive}
          disabled={!canEdit}
          label={`${slot.name} active`}
        />
        <button
          type="button"
          onClick={startEditing}
          disabled={!canEdit}
          className="cursor-pointer text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Edit ${slot.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canEdit}
          className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Remove ${slot.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
