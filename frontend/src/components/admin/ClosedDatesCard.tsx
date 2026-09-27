"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import type {
  ClosedDateAppliesTo,
  ClosedDateEntry,
} from "@/lib/api/admin-settings";
import { getClosedDateImpact } from "@/lib/api/admin-subscriptions";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { qk } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/context/ConfirmContext";

const APPLIES_TO_OPTIONS: { value: ClosedDateAppliesTo; label: string }[] = [
  { value: "ORDERS", label: "Orders" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
  { value: "BOTH", label: "Both" },
];

const APPLIES_TO_LABEL: Record<ClosedDateAppliesTo, string> = {
  ORDERS: "Orders",
  SUBSCRIPTIONS: "Subscriptions",
  BOTH: "Orders + subscriptions",
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ClosedDatesCardProps {
  value: ClosedDateEntry[];
  /** Persists the new list; resolves false when saving failed. */
  onChange: (next: ClosedDateEntry[]) => Promise<boolean>;
  canEdit: boolean;
  /** Tenant has the plan-calendar-view feature — only then can a closure
   * also skip subscription deliveries and show on the plan calendar. */
  subscriptionsAvailable: boolean;
}

/** Date-specific closures (holidays). Customer-visible name and note show
 * on the storefront plan calendar when subscriptions are affected. */
export function ClosedDatesCard({
  value,
  onChange,
  canEdit,
  subscriptionsAvailable,
}: ClosedDatesCardProps) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  // A holiday usually closes the whole kitchen, so it defaults to BOTH once
  // subscriptions can be closed at all. Derived rather than seeded into
  // state, because the feature flag loads after the first render.
  const [appliesToChoice, setAppliesTo] = useState<ClosedDateAppliesTo | null>(
    null,
  );
  const appliesTo: ClosedDateAppliesTo =
    appliesToChoice ?? (subscriptionsAvailable ? "BOTH" : "ORDERS");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  // Only worth checking once subscriptions are actually in play for this
  // date, and once the admin has stopped typing — a keystroke-per-request
  // warning would be noisy for no benefit.
  const debouncedDate = useDebouncedValue(date, 400);
  const touchesSubscriptions = subscriptionsAvailable && appliesTo !== "ORDERS";
  const alreadyClosed = value.some((d) => d.date === debouncedDate);
  const { data: impact } = useQuery({
    queryKey: qk.admin("subscriptions", "closed-date-impact", debouncedDate),
    queryFn: () => getClosedDateImpact(debouncedDate),
    enabled: Boolean(debouncedDate) && touchesSubscriptions && !alreadyClosed,
    staleTime: 60_000,
  });
  const affectedCount =
    touchesSubscriptions && !alreadyClosed ? (impact?.count ?? 0) : 0;

  async function add() {
    if (!date || busy) return;
    const entry: ClosedDateEntry = {
      date,
      name: name.trim() || null,
      note: note.trim() || null,
      appliesTo: subscriptionsAvailable ? appliesTo : "ORDERS",
    };
    setBusy(true);
    // Same date twice replaces the earlier entry, matching what the server keeps.
    const saved = await onChange(
      [...value.filter((d) => d.date !== date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setBusy(false);
    // A failed save keeps what was typed so the admin can just retry.
    if (!saved) return;
    setDate("");
    setName("");
    setNote("");
  }

  function remove(entry: ClosedDateEntry) {
    if (busy) return;
    const touches = subscriptionsAvailable && entry.appliesTo !== "ORDERS";
    confirm({
      title: "Remove closed date?",
      message: `${entry.name ?? "This closure"} on ${formatDate(entry.date)} will be removed${
        touches
          ? " — orders and subscription deliveries resume on that day as normal."
          : " — orders are accepted on that day as normal."
      }`,
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        setBusy(true);
        await onChange(value.filter((d) => d.date !== entry.date));
        setBusy(false);
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Closed dates &amp; holidays
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {subscriptionsAvailable
            ? "Customers see the name and note on the plan calendar. Use Declare disruption for unplanned closures."
            : "Orders are not accepted on these dates."}
        </p>
      </div>

      {value.length === 0 ? (
        <EmptyState compact title="No closed dates set." />
      ) : (
        <ul className="flex flex-col gap-2">
          {value.map((entry) => (
            <li
              key={entry.date}
              className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.name ?? "Closed"}
                  <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {formatDate(entry.date)}
                  </span>
                </p>
                {entry.note && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {entry.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {subscriptionsAvailable && (
                  <span className="badge bg-zinc-200 text-[10px] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    {APPLIES_TO_LABEL[entry.appliesTo]}
                  </span>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(entry)}
                    disabled={busy}
                    className="cursor-pointer text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remove ${entry.name ?? entry.date}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-44"
              aria-label="Closed date"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name, e.g. Diwali"
              maxLength={80}
              className="input min-w-40 flex-1"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for customers (optional)"
            maxLength={300}
            className="input w-full"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {subscriptionsAvailable ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Applies to
                </span>
                <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                  {APPLIES_TO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAppliesTo(opt.value)}
                      className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        appliesTo === opt.value
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void add()}
              disabled={!date || busy}
              className="btn-outline btn-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {busy ? "Saving…" : "Add closed date"}
            </button>
          </div>
          {affectedCount > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>{affectedCount}</strong> subscriber
                {affectedCount === 1 ? " has" : "s have"} deliveries on this
                day.
                For unplanned closures, use Declare disruption instead.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
