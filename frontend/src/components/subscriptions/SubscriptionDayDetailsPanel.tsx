"use client";

import { useState } from "react";
import { CalendarOff, ImageOff, Lock, SkipForward } from "lucide-react";
import type {
  SubscriptionCalendarDay,
  SubscriptionDetail,
} from "@/lib/api/subscriptions";
import { formatLongDate, formatWeekday } from "@/lib/plan-calendar/month-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { formatTime12h } from "@/lib/format/time";
import { STATUS_BADGE, STATUS_LABELS } from "./subscription-calendar-styles";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** The selected calendar date's meals plus, for an editable upcoming day,
 * address/time/note controls, skip, and (if the tenant allows it) moving
 * the delivery to another date. */
export function SubscriptionDayDetailsPanel({
  day,
  subscription,
  busy,
  onSkip,
  onSaveOverride,
  onOpenMove,
}: {
  day: SubscriptionCalendarDay | null;
  subscription: SubscriptionDetail;
  busy: boolean;
  onSkip: (date: string) => void;
  onSaveOverride: (
    date: string,
    addressId: string,
    deliverySlotId: string,
    note: string,
  ) => void;
  onOpenMove: (date: string) => void;
}) {
  // Callers key this component by `day.date`, so a fresh instance (and
  // fresh draft state) mounts whenever the focused date changes.
  const [addressId, setAddressId] = useState(day?.addressId ?? "");
  const [slotId, setSlotId] = useState(day?.deliverySlotId ?? "");
  const [note, setNote] = useState(day?.note ?? "");

  if (!day) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Pick a date to see its details.
      </p>
    );
  }

  const canChangeTime = subscription.canOverrideTime && day.meals.length <= 1;
  const editable = day.kind === "UPCOMING" && !day.locked;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {formatLongDate(day.date)}
        </h3>
        <span className={`badge text-[11px] ${STATUS_BADGE[day.kind]}`}>
          {STATUS_LABELS[day.kind]}
        </span>
      </div>

      {day.reason && (
        <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {day.kind === "DISRUPTED" ? "Delivery disrupted" : "Kitchen closed"}
          </p>
          <p className="mt-0.5 font-medium">{day.reason}</p>
          {day.replacementDate && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              You don&apos;t lose this delivery — a replacement day is added
              on {formatLongDate(day.replacementDate)}, at the end of your plan.
            </p>
          )}
        </div>
      )}

      {day.kind === "PROJECTED" && (
        <p className="rounded-xl bg-primary-50 px-3 py-2.5 text-xs text-primary-700 dark:bg-primary-950/40 dark:text-primary-400">
          Added to make up for a holiday in your plan. It becomes a regular
          delivery once the holiday passes.
        </p>
      )}

      {day.kind === "OFF_DAY" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
          <CalendarOff className="h-6 w-6 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No deliveries on this day
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This plan doesn&apos;t deliver on {formatWeekday(day.date)}s.
          </p>
        </div>
      )}

      {day.kind === "NOT_SCHEDULED" && (
        <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          This date isn&apos;t part of your plan.
        </p>
      )}

      {day.meals.length > 0 && (
        <ul className="flex flex-col gap-3">
          {day.meals.map((meal) => (
            <li
              key={meal.slotType}
              className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {meal.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={meal.imageUrl}
                    alt={meal.name ?? ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageOff
                    className="h-5 w-5 text-zinc-300 dark:text-zinc-600"
                    strokeWidth={1.5}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {SLOT_LABELS[meal.slotType] ?? meal.slotType}
                </p>
                <p
                  className={
                    meal.name
                      ? "truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                      : "text-sm text-zinc-400 italic dark:text-zinc-500"
                  }
                >
                  {meal.name ?? "Meal to be announced"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(day.kind === "DELIVERED" || day.kind === "UPCOMING") && (
        <div className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Address</span>
          <span className="text-sm text-zinc-900 dark:text-zinc-100">
            {subscription.addresses.find((a) => a.id === day.addressId)
              ?.line1 ?? "Address unavailable"}
          </span>
        </div>
      )}

      {day.kind === "UPCOMING" && day.locked && (
        <p className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Lock className="h-3.5 w-3.5" />
          Changes are closed — less than 24h before delivery.
        </p>
      )}

      {editable && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div
            className={`grid grid-cols-1 gap-2 ${canChangeTime ? "sm:grid-cols-2" : ""}`}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Change address
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
                  Change time
                </label>
                <Select value={slotId} onValueChange={setSlotId}>
                  <SelectTrigger className="py-1.5 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    {subscription.deliverySlots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({formatTime12h(s.startTime)}–
                        {formatTime12h(s.endTime)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Note for this delivery (optional)"
            className="input w-full resize-none text-sm"
          />
          <button
            type="button"
            onClick={() =>
              onSaveOverride(
                day.date,
                addressId,
                canChangeTime ? slotId : "",
                note,
              )
            }
            disabled={busy}
            className="btn-primary btn-sm cursor-pointer self-start"
          >
            Save changes
          </button>
          <div className="flex flex-wrap gap-2">
            {subscription.canMoveDates && (
              <button
                type="button"
                onClick={() => onOpenMove(day.date)}
                disabled={busy}
                className="btn-outline btn-sm cursor-pointer"
              >
                Move to another date
              </button>
            )}
            <button
              type="button"
              onClick={() => onSkip(day.date)}
              disabled={busy}
              className="btn-outline btn-sm cursor-pointer text-red-600"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip this delivery
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
