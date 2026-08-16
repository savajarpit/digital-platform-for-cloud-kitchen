"use client";

import { useState } from "react";
import { ApiError, type PlatformPlanInput } from "@/lib/api/admin-platform-plans";
import { useToast } from "@/context/ToastContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

export function PlatformPlanForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlatformPlanInput;
  onCancel: () => void;
  onSave: (input: PlatformPlanInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Plan saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Starter"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Price (₹, per cycle)
          </label>
          <input
            type="number"
            min={0}
            value={form.priceInPaise / 100}
            onChange={(e) => setForm({ ...form, priceInPaise: Math.round(Number(e.target.value) * 100) })}
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Billing cycle</label>
          <Select
            value={form.billingCycle}
            onValueChange={(v) =>
              setForm({ ...form, billingCycle: v as PlatformPlanInput["billingCycle"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Sort order</label>
          <input
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Max orders / month
          </label>
          <input
            type="number"
            min={0}
            value={form.defaultMaxOrdersPerMonth}
            onChange={(e) => setForm({ ...form, defaultMaxOrdersPerMonth: Number(e.target.value) })}
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Max active subscribers
          </label>
          <input
            type="number"
            min={0}
            value={form.defaultMaxSubscribers}
            onChange={(e) => setForm({ ...form, defaultMaxSubscribers: Number(e.target.value) })}
            required
            className="input"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={form.isPublished ?? false}
          onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          className="h-4 w-4 accent-primary-600"
        />
        Published (shown on the marketing site)
      </label>
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
