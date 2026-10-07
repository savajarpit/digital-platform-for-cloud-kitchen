"use client";

import { useState } from "react";
import { ChevronDown, Lock, MapPin, SkipForward } from "lucide-react";
import type { SubscriptionDetail, UpcomingPreviewDay } from "@/lib/api/subscriptions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MealThumb } from "@/components/ui/MealThumb";
import { formatTime12h } from "@/lib/format/time";
import { formatLongDate } from "@/lib/plan-calendar/month-grid";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** One upcoming delivery day on the subscription detail page — collapsed row
 * plus an expandable editor (address / time / note override, skip). */
export function SubscriptionDayCard({
  day,
  subscription,
  expanded,
  busy,
  onToggle,
  onSkip,
  onSaveOverride,
}: {
  day: UpcomingPreviewDay;
  subscription: SubscriptionDetail;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onSaveOverride: (addressId: string, deliverySlotId: string, note: string) => void;
}) {
  const [addressId, setAddressId] = useState(day.addressId);
  const [slotId, setSlotId] = useState(day.deliverySlotId ?? "");
  const [note, setNote] = useState(day.note ?? "");

  const address = subscription.addresses.find((a) => a.id === day.addressId);
  const slot = subscription.deliverySlots.find((s) => s.id === day.deliverySlotId);
  // A single delivery window can't realistically cover breakfast AND dinner —
  // only offer a time change when the day has at most one meal, and only if
  // the tenant hasn't had time-selection locked platform-side.
  const canChangeTime = subscription.canOverrideTime && day.meals.length <= 1;

  return (
    <div className="rounded-lg border border-zinc-100 dark:border-zinc-800">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </span>
            {day.onHold && (
              <span className="badge bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400">On hold</span>
            )}
            {day.skipped && !day.onHold && !day.disruptionReason && (
              <span className="badge bg-zinc-100 text-zinc-500 dark:bg-zinc-800">Skipped</span>
            )}
            {day.skipped && day.disruptionReason && (
              <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {day.isHoliday ? "Holiday" : "Paused by the business"}
              </span>
            )}
            {/* A change made before the day was skipped no longer applies. */}
            {day.isOverridden && !day.skipped && (
              <span className="badge bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400">
                Changed
              </span>
            )}
            {day.locked && !day.onHold && (
              <span className="badge inline-flex items-center gap-1 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
            {!day.skipped && day.meals.length > 0 && (
              <span className="text-xs text-zinc-400">
                {day.meals.length} meal{day.meals.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {!day.skipped && day.meals.length === 0 && (
            <p className="text-xs text-zinc-400 italic">Meal to be announced</p>
          )}
          {day.skipped && day.disruptionReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{day.disruptionReason}</p>
          )}
          {day.replacementDate && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              A replacement day is added on {formatLongDate(day.replacementDate)}, at the end of your plan.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!day.skipped && !day.locked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              disabled={busy}
              className="btn-outline btn-sm"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-zinc-100 px-3.5 py-3.5 dark:border-zinc-800">
          {!day.skipped && day.meals.length > 0 && (
            <div className="flex flex-col gap-2">
              {day.meals.map((meal, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <MealThumb src={meal.imageUrl} alt={meal.name ?? ""} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">{SLOT_LABELS[meal.slotType] ?? meal.slotType}</p>
                    <p className="truncate pr-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {meal.name ?? "Meal to be announced"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {address ? `${address.line1}, ${address.city}` : "Address unavailable"}
              {slot && ` · ${slot.name} (${formatTime12h(slot.startTime)}–${formatTime12h(slot.endTime)})`}
            </span>
          </div>

          {day.skipped ? (
            // Nothing is delivered on a skipped day, so there's no address,
            // time or note to change for it.
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {day.onHold
                ? "No delivery while the kitchen reviews your cancellation request. If they decline it, this day is added back at the end of your plan."
                : day.disruptionReason
                  ? "There's no delivery on this day, so there's nothing to change."
                  : "You skipped this delivery, so there's nothing to change for this day."}
            </p>
          ) : day.locked ? (
            <>
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                Too close to delivery to change — this day is locked.
              </p>
              {day.note && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Note: </span>
                  {day.note}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div
                className={`grid grid-cols-1 gap-2 sm:items-end ${
                  canChangeTime ? "sm:grid-cols-[1fr_1fr]" : "sm:grid-cols-1"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Change address for this day
                  </label>
                  <Select value={addressId} onValueChange={setAddressId}>
                    <SelectTrigger className="py-1.5 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subscription.addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label ? `${a.label} — ` : ""}
                          {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canChangeTime && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Change time for this day
                    </label>
                    <Select value={slotId} onValueChange={setSlotId}>
                      <SelectTrigger className="py-1.5 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No preference</SelectItem>
                        {subscription.deliverySlots.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({formatTime12h(s.startTime)}–{formatTime12h(s.endTime)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Note for this delivery (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="No onions, leave at gate…"
                  className="input w-full resize-none text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => onSaveOverride(addressId, canChangeTime ? slotId : "", note)}
                disabled={busy}
                className="btn-primary btn-sm self-start"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
