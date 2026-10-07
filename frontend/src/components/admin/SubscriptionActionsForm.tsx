"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  pauseAdmin,
  setDayOverrideAdmin,
  skipDayAdmin,
} from "@/lib/api/admin-subscriptions";
import { getCustomer } from "@/lib/api/admin-customers";
import { Skeleton } from "@/components/ui/Skeleton";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { useToast } from "@/context/ToastContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { addDaysToDateStr } from "@/lib/format/date";
import { formatTime12h } from "@/lib/format/time";

/** Mirrors the backend's MAX_PAUSE_DAYS (subscription-day-rules.ts). */
const MAX_PAUSE_DAYS = 30;
/** Select has no empty value — this stands for "leave it as the plan default". */
const KEEP_DEFAULT = "__default__";

type Slot = { id: string; name: string; startTime: string; endTime: string };

type Mode = "SKIP" | "PAUSE" | "OVERRIDE";

/** Inline expand/collapse form (no Modal component in this codebase, same
 * pattern as DeclareDisruptionForm/CancelRefundForm) for an admin acting on
 * a customer's subscription on their behalf — e.g. the customer calls in
 * asking to skip a day, pause a range, or change an upcoming delivery's
 * address. Mirrors the customer's own mine/:id/{skip,pause,day-override}
 * actions exactly, just scoped to any subscriber in the tenant instead of
 * "my own". */
export function SubscriptionActionsForm({
  subscriptionId,
  customerUserId,
  deliverySlots,
  onDone,
}: {
  subscriptionId: string;
  customerUserId: string;
  /** Times staff may switch a day to — empty when SUPER_ADMIN locked time choice. */
  deliverySlots: Slot[];
  onDone: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("SKIP");
  const [date, setDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [addressId, setAddressId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Local calendar date; the server applies the business's notice rule.
  const today = new Date().toLocaleDateString("en-CA");

  // Only fetched once the override form is open; cached per customer.
  const customerQuery = useQuery({
    queryKey: qk.admin("subscriptions", "customer", customerUserId),
    queryFn: () => getCustomer(customerUserId),
    enabled: open && mode === "OVERRIDE",
    staleTime: STALE.short,
  });
  const addresses = customerQuery.data
    ? customerQuery.data.addresses
    : customerQuery.isError
      ? []
      : null;

  const canSubmit =
    mode === "SKIP"
      ? Boolean(date)
      : mode === "PAUSE"
        ? Boolean(dateFrom) && Boolean(dateTo)
        : Boolean(date) && (Boolean(addressId) || Boolean(slotId) || Boolean(note.trim()));

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (mode === "SKIP") {
        await skipDayAdmin(subscriptionId, date);
        showToast("Day skipped", "success");
      } else if (mode === "PAUSE") {
        await pauseAdmin(subscriptionId, dateFrom, dateTo);
        showToast("Subscription paused for the selected range", "success");
      } else {
        await setDayOverrideAdmin(subscriptionId, {
          date,
          addressId: addressId || undefined,
          deliverySlotId: slotId || undefined,
          note: note.trim() || undefined,
        });
        showToast("Day updated", "success");
      }
      setOpen(false);
      setDate("");
      setDateFrom("");
      setDateTo("");
      setAddressId("");
      setSlotId("");
      setNote("");
      void invalidateSubscriptionAreas(queryClient);
      onDone();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't apply that change.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline btn-sm w-fit cursor-pointer"
      >
        Act on Behalf
      </button>
    );
  }

  return (
    <div className="flex basis-full flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        For when the customer calls in and asks you to make this change for them.
      </p>
      <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <SelectTrigger className="w-full sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SKIP">Skip a single day</SelectItem>
          <SelectItem value="PAUSE">Pause a date range</SelectItem>
          <SelectItem value="OVERRIDE">Change one upcoming day</SelectItem>
        </SelectContent>
      </Select>

      {mode === "SKIP" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Date</label>
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
      )}

      {mode === "PAUSE" && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Up to {MAX_PAUSE_DAYS} days, starting within the plan. Only real delivery days are paused, and they&apos;re
          added after the pause ends.
        </p>
      )}
      {mode === "PAUSE" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">From</label>
            <input
              type="date"
              value={dateFrom}
              min={today}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || today}
              max={dateFrom ? addDaysToDateStr(dateFrom, MAX_PAUSE_DAYS - 1) : undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}

      {mode === "OVERRIDE" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Date</label>
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Deliver to a different saved address that day (optional)
            </label>
            {!addresses ? (
              <Skeleton className="h-[42px] w-full rounded-xl" />
            ) : addresses.length === 0 ? (
              <p className="text-xs text-zinc-400">This customer has no other saved addresses.</p>
            ) : (
              <Select
                value={addressId || KEEP_DEFAULT}
                onValueChange={(v) => setAddressId(v === KEEP_DEFAULT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_DEFAULT}>Keep the default address</SelectItem>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label ? `${a.label} — ` : ""}
                      {a.line1}, {a.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {deliverySlots.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Delivery time that day (optional)
              </label>
              <Select value={slotId || KEEP_DEFAULT} onValueChange={(v) => setSlotId(v === KEEP_DEFAULT ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_DEFAULT}>Keep the usual time</SelectItem>
                  {deliverySlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name} ({formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Customer called in, deliver to office instead today"
              className="input w-full resize-none"
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="btn-primary btn-sm w-fit cursor-pointer"
        >
          {submitting ? "Saving…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost btn-sm w-fit cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
