"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  getOrderAcceptance,
  updateOrderAcceptance,
  type DayHours,
  type OperatingHours,
  type OrderAcceptanceSettings,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { InstantDeliveryCard } from "@/components/admin/InstantDeliveryCard";

const DAYS: { key: keyof OperatingHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export default function OrderHoursPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.ORDER_HOURS_EDIT);

  const [settings, setSettings] = useState<OrderAcceptanceSettings | null>(null);
  const [hours, setHours] = useState<OperatingHours>({});
  const [cutoff, setCutoff] = useState("");
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrderAcceptance()
      .then((s) => {
        setSettings(s);
        setHours(s.operatingHours ?? {});
        setCutoff(s.dailyCutoffTime ?? "");
        setClosedDates(s.closedDates ?? []);
        setIsTemporarilyClosed(s.isTemporarilyClosed);
        setClosureReason(s.closureReason ?? "");
      })
      .catch(() => setError("Couldn't load order hours."));
  }, []);

  function updateDay(day: keyof OperatingHours, patch: DayHours) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function addClosedDate() {
    if (!newClosedDate || closedDates.includes(newClosedDate)) return;
    setClosedDates((prev) => [...prev, newClosedDate].sort());
    setNewClosedDate("");
  }

  function removeClosedDate(date: string) {
    setClosedDates((prev) => prev.filter((d) => d !== date));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updateOrderAcceptance({
        operatingHours: hours,
        dailyCutoffTime: cutoff || undefined,
        closedDates,
        isTemporarilyClosed,
        closureReason: closureReason || undefined,
      });
      setSettings(updated);
      showToast("Order hours saved", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Clock className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Order Hours
        </h2>
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-70">
        <div className="card flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Temporarily closed
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Stop accepting new orders immediately, regardless of hours below.
              </p>
            </div>
            <Toggle checked={isTemporarilyClosed} onChange={setIsTemporarilyClosed} disabled={!canEdit} />
          </div>
          {isTemporarilyClosed && (
            <input
              type="text"
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="Reason shown to customers (optional)"
              className="input w-full"
            />
          )}
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Operating hours
          </h3>
          {DAYS.map((day) => {
            const dayHours = hours[day.key] ?? {};
            return (
              <div key={day.key} className="flex flex-wrap items-center gap-3">
                <span className="w-28 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {day.label}
                </span>
                <input
                  type="time"
                  value={dayHours.open ?? ""}
                  onChange={(e) => updateDay(day.key, { open: e.target.value })}
                  className="input w-36"
                />
                <span className="text-sm text-zinc-400">to</span>
                <input
                  type="time"
                  value={dayHours.close ?? ""}
                  onChange={(e) => updateDay(day.key, { close: e.target.value })}
                  className="input w-36"
                />
              </div>
            );
          })}
          <div className="pt-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Daily cutoff time
            </label>
            <input
              type="time"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="input w-36"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Orders stop being accepted after this time each day, even if still within operating hours.
            </p>
          </div>
        </div>

        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Closed dates</h3>
          <div className="flex flex-wrap gap-2">
            {closedDates.map((date) => (
              <span
                key={date}
                className="badge gap-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {date}
                <button
                  type="button"
                  onClick={() => removeClosedDate(date)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label={`Remove ${date}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {closedDates.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No closed dates set.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              className="input w-48"
            />
            <button type="button" onClick={addClosedDate} className="btn-outline btn-sm">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>

      <InstantDeliveryCard canEdit={canEdit} />
    </form>
  );
}
