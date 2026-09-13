"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  pauseAdmin,
  setDayOverrideAdmin,
  skipDayAdmin,
} from "@/lib/api/admin-subscriptions";
import { getCustomer, type CustomerAddress } from "@/lib/api/admin-customers";
import { useToast } from "@/context/ToastContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

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
  onDone,
}: {
  subscriptionId: string;
  customerUserId: string;
  onDone: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("SKIP");
  const [date, setDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [addressId, setAddressId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || mode !== "OVERRIDE" || addresses) return;
    getCustomer(customerUserId)
      .then((detail) => setAddresses(detail.addresses))
      .catch(() => setAddresses([]));
  }, [open, mode, addresses, customerUserId]);

  const canSubmit =
    mode === "SKIP"
      ? Boolean(date)
      : mode === "PAUSE"
        ? Boolean(dateFrom) && Boolean(dateTo)
        : Boolean(date) && (Boolean(addressId) || Boolean(note.trim()));

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
          note: note.trim() || undefined,
        });
        showToast("Day updated", "success");
      }
      setOpen(false);
      setDate("");
      setDateFrom("");
      setDateTo("");
      setAddressId("");
      setNote("");
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
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        For when the customer calls in and asks you to make this change for them.
      </p>
      <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <SelectTrigger className="w-56">
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
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
      )}

      {mode === "PAUSE" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
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
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Deliver to a different saved address that day (optional)
            </label>
            {!addresses ? (
              <p className="text-xs text-zinc-400">Loading addresses…</p>
            ) : addresses.length === 0 ? (
              <p className="text-xs text-zinc-400">This customer has no other saved addresses.</p>
            ) : (
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep the default address" />
                </SelectTrigger>
                <SelectContent>
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
