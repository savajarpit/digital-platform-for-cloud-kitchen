"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import {
  ApiError,
  getOrderAcceptance,
  updateOrderAcceptance,
  type ClosedDateEntry,
  type DayHours,
  type OperatingHours,
  type OrderAcceptanceSettings,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Toggle } from "@/components/ui/Toggle";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderHoursSkeleton } from "@/components/admin/skeletons/OrderHoursSkeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { InstantDeliveryCard } from "@/components/admin/InstantDeliveryCard";
import { ClosedDatesCard } from "@/components/admin/ClosedDatesCard";
import { TimeInput12h } from "@/components/ui/TimeInput12h";

const DAYS: { key: keyof OperatingHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type FormState = {
  hours: OperatingHours;
  cutoff: string;
  closedDates: ClosedDateEntry[];
  isTemporarilyClosed: boolean;
  closureReason: string;
};

function toForm(s: OrderAcceptanceSettings): FormState {
  return {
    hours: s.operatingHours ?? {},
    cutoff: s.dailyCutoffTime ?? "",
    closedDates: s.closedDates ?? [],
    isTemporarilyClosed: s.isTemporarilyClosed,
    closureReason: s.closureReason ?? "",
  };
}

export default function OrderHoursPage() {
  const { showToast } = useToast();
  const canEdit = usePermission(PERMISSIONS.ORDER_HOURS_EDIT);
  const { has: hasFeature } = useFeatures();

  const queryClient = useQueryClient();
  const queryKey = qk.admin("settings", "hours");
  const { data, isError } = useQuery({
    queryKey,
    queryFn: getOrderAcceptance,
    staleTime: STALE.list,
  });
  // Unsaved edits live in `draft`; a background refetch never overwrites them.
  const [draft, setDraft] = useState<FormState | null>(null);
  const form = draft ?? (data ? toForm(data) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchForm(fn: (f: FormState) => Partial<FormState>) {
    setDraft((prev) => {
      const base = prev ?? toForm(data!);
      return { ...base, ...fn(base) };
    });
  }

  function updateDay(day: keyof OperatingHours, patch: DayHours) {
    patchForm((f) => ({ hours: { ...f.hours, [day]: { ...f.hours[day], ...patch } } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { hours, cutoff, closedDates, isTemporarilyClosed, closureReason } = form;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateOrderAcceptance({
        operatingHours: hours,
        dailyCutoffTime: cutoff || undefined,
        closedDates: closedDates.map((d) => ({
          date: d.date,
          name: d.name ?? undefined,
          note: d.note ?? undefined,
          appliesTo: d.appliesTo,
        })),
        isTemporarilyClosed,
        closureReason: closureReason || undefined,
      });
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey });
      setDraft(null);
      showToast("Order hours saved", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't save changes.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return isError ? (
      <EmptyState compact icon={Clock} title="Couldn't load order hours." />
    ) : (
      <OrderHoursSkeleton />
    );
  }
  const { hours, cutoff, closedDates, isTemporarilyClosed, closureReason } = form;

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
            <Toggle checked={isTemporarilyClosed} onChange={(v) => patchForm(() => ({ isTemporarilyClosed: v }))} disabled={!canEdit} />
          </div>
          {isTemporarilyClosed && (
            <input
              type="text"
              value={closureReason}
              onChange={(e) => patchForm(() => ({ closureReason: e.target.value }))}
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
                <TimeInput12h
                  value={dayHours.open ?? ""}
                  onChange={(v) => updateDay(day.key, { open: v })}
                  disabled={!canEdit}
                />
                <span className="text-sm text-zinc-400">to</span>
                <TimeInput12h
                  value={dayHours.close ?? ""}
                  onChange={(v) => updateDay(day.key, { close: v })}
                  disabled={!canEdit}
                />
              </div>
            );
          })}
          <div className="pt-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Daily cutoff time
            </label>
            <TimeInput12h value={cutoff} onChange={(v) => patchForm(() => ({ cutoff: v }))} disabled={!canEdit} />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Orders stop being accepted after this time each day, even if still within operating hours.
            </p>
          </div>
        </div>

        <ClosedDatesCard
          value={closedDates}
          onChange={(next) => patchForm(() => ({ closedDates: next }))}
          canEdit={canEdit}
          subscriptionsAvailable={hasFeature("plan-calendar-view")}
        />

        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>

      <InstantDeliveryCard canEdit={canEdit} />
    </form>
  );
}
