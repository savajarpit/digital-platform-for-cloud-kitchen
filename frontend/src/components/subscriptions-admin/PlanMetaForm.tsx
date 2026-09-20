"use client";

import { useState } from "react";
import {
  ApiError,
  type PlanAccentColor,
  type PlanInput,
  type SchedulingMode,
  type OffDayHandling,
} from "@/lib/api/admin-subscriptions";
import { useToast } from "@/context/ToastContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

const paiseToRupees = (paise: number) => String(paise / 100);
const rupeesToPaise = (rupees: string): number => Math.round(Number(rupees) * 100);

export function PlanMetaForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlanInput;
  onCancel: () => void;
  onSave: (input: PlanInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  // `initial` is the saved state (recomputed each render from the cache); local
  // edits live in `draft` so a background refetch never overwrites them.
  const [draft, setForm] = useState<PlanInput | null>(null);
  const form = draft ?? initial;
  const [saving, setSaving] = useState(false);
  const schedulingMode: SchedulingMode = form.schedulingMode ?? "RELATIVE_DAY";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-3 border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="7-Day Weight Loss Plan"
            className="input"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Description (optional)
          </label>
          <input
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Duration (days)</label>
          <input
            type="number"
            min={1}
            value={form.durationDays}
            onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
            className="input"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Full price (₹)</label>
          <input
            type="number"
            min={1}
            value={paiseToRupees(form.priceInPaise)}
            onChange={(e) => setForm({ ...form, priceInPaise: rupeesToPaise(e.target.value) })}
            className="input"
            required
          />
        </div>
      </div>

      <div className="border-t border-primary-200 pt-3 dark:border-primary-900">
        <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Scheduling</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Menu schedule</label>
            <Select
              value={schedulingMode}
              onValueChange={(v) => setForm({ ...form, schedulingMode: v as SchedulingMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELATIVE_DAY">Relative days (Day 1, Day 2…)</SelectItem>
                <SelectItem value="WEEKLY_FIXED">Fixed weekly menu (real weekdays)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-400">
              {schedulingMode === "WEEKLY_FIXED"
                ? "Every subscriber eating on the same real weekday gets the same dish — batch cook once."
                : "Each subscriber's Day 1 is whenever they join, cycling once the plan's days run out."}
            </p>
          </div>
          {schedulingMode === "WEEKLY_FIXED" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Weeks in rotation
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={form.weekCount ?? 1}
                  onChange={(e) => setForm({ ...form, weekCount: Number(e.target.value) })}
                  className="input"
                />
                <p className="text-xs text-zinc-400">
                  1 for the same week every time, 4 for a month of variety before it repeats.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Week 1 starts on
                </label>
                <input
                  type="date"
                  value={form.scheduleAnchorDate ?? ""}
                  onChange={(e) => setForm({ ...form, scheduleAnchorDate: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Off days (weekdays with no meals)
                </label>
                <Select
                  value={form.offDayHandling ?? "LOSS_DELIVERY"}
                  onValueChange={(v) =>
                    setForm({ ...form, offDayHandling: v as OffDayHandling })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOSS_DELIVERY">Count toward the paid duration</SelectItem>
                    <SelectItem value="EXTEND_TO_COMPENSATE">Don&apos;t count — extend the plan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-400">
                  {(form.offDayHandling ?? "LOSS_DELIVERY") === "EXTEND_TO_COMPENSATE"
                    ? "A subscriber still gets every paid delivery — the plan stretches past days with no meals scheduled."
                    : "Days with no meals scheduled eat into the paid duration, same as today."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-primary-200 pt-3 dark:border-primary-900">
        <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Storefront card
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Badge text (optional)
            </label>
            <input
              value={form.badgeText ?? ""}
              onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
              placeholder="Most Popular"
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Accent color
            </label>
            <Select
              value={form.accentColor ?? "PRIMARY"}
              onValueChange={(v) => setForm({ ...form, accentColor: v as PlanAccentColor })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">Primary</SelectItem>
                <SelectItem value="SECONDARY">Secondary</SelectItem>
                <SelectItem value="ACCENT">Accent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.isPopular ?? false}
              onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Highlight as popular
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Feature bullets (shown on the plan card)
          </label>
          <FeatureListEditor
            features={form.features ?? []}
            onChange={(features) => setForm({ ...form, features })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (features: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addFeature() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...features, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {features.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              <span className="min-w-0 flex-1 wrap-break-word text-zinc-700 dark:text-zinc-300">{feature}</span>
              <button
                type="button"
                onClick={() => onChange(features.filter((_, idx) => idx !== i))}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFeature();
            }
          }}
          placeholder="Free delivery"
          className="input"
        />
        <button type="button" onClick={addFeature} className="btn-outline btn-sm shrink-0">
          Add
        </button>
      </div>
    </div>
  );
}
