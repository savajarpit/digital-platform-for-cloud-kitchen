"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  FileText,
  ImageOff,
  Lock,
  MapPin,
  SkipForward,
} from "lucide-react";
import {
  ApiError,
  cancelSubscription,
  getMySubscription,
  pauseSubscription,
  setDayOverride,
  skipDay,
  type SubscriptionDetail,
  type UpcomingPreviewDay,
} from "@/lib/api/subscriptions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pauseFrom, setPauseFrom] = useState("");
  const [pauseTo, setPauseTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  function reload() {
    getMySubscription(id)
      .then(setSubscription)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?redirect=/account/subscriptions/${id}`);
          return;
        }
        setNotFound(true);
      });
  }

  useEffect(reload, [id, router]);

  async function handleSkip(date: string) {
    setBusy(true);
    try {
      await skipDay(id, date);
      showToast("Day skipped — pushed to the end of your plan.", "success");
      reload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't skip this day.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handlePause(e: React.FormEvent) {
    e.preventDefault();
    if (!pauseFrom || !pauseTo) return;
    setBusy(true);
    try {
      await pauseSubscription(id, pauseFrom, pauseTo);
      showToast("Paused for the selected range.", "success");
      setPauseFrom("");
      setPauseTo("");
      reload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't pause.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDayOverrideSave(
    date: string,
    addressId: string,
    deliverySlotId: string,
    note: string,
  ) {
    setBusy(true);
    try {
      await setDayOverride(id, {
        date,
        addressId: addressId || undefined,
        deliverySlotId: deliverySlotId || undefined,
        note,
      });
      showToast("Delivery updated for that day.", "success");
      reload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update that day.", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    confirm({
      message: "Cancel this subscription? This cannot be undone.",
      confirmLabel: "Cancel Subscription",
      processingLabel: "Cancelling…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await cancelSubscription(id);
          showToast("Subscription cancelled.", "success");
          reload();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't cancel.", "error");
        }
      },
    });
  }

  if (notFound) {
    return (
      <main className="container-app flex-1 py-16 text-center">
        <h1 className="section-title text-zinc-900 dark:text-zinc-100">Subscription not found</h1>
        <Link href="/account/subscriptions" className="btn-primary mt-6">
          Back to my subscriptions
        </Link>
      </main>
    );
  }

  if (!subscription) {
    return (
      <main className="container-app flex-1 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
      </main>
    );
  }

  const isActive = subscription.status === "ACTIVE";

  return (
    <main className="container-app flex-1 py-10">
      <Link
        href="/account/subscriptions"
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-primary-600 dark:text-zinc-400"
      >
        <ChevronLeft className="h-4 w-4" />
        My Subscriptions
      </Link>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-primary-600">
            <CalendarClock className="h-5 w-5" />
            <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {subscription.planNameSnapshot}
            </h1>
            <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[subscription.status]}`}>
              {subscription.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {formatPriceFromPaise(subscription.priceInPaiseSnapshot)}
            {subscription.cycleEnd &&
              ` · Active through ${new Date(subscription.cycleEnd).toLocaleDateString()}`}
            {subscription.bankedDays > 0 && ` · ${subscription.bankedDays} day(s) banked`}
          </p>
        </div>
        <Link
          href={`/account/subscriptions/${id}/invoice`}
          className="btn-outline btn-sm shrink-0"
        >
          <FileText className="h-3.5 w-3.5" />
          Invoice
        </Link>
      </div>

      {isActive && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upcoming days</h2>
            <div className="flex flex-col gap-2">
              {subscription.upcoming.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing scheduled.</p>
              ) : (
                subscription.upcoming.map((day) => (
                  <DayCard
                    key={day.date}
                    day={day}
                    subscription={subscription}
                    expanded={expandedDate === day.date}
                    busy={busy}
                    onToggle={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                    onSkip={() => handleSkip(day.date)}
                    onSaveOverride={(addressId, slotId, note) =>
                      handleDayOverrideSave(day.date, addressId, slotId, note)
                    }
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <form onSubmit={handlePause} className="card flex flex-col gap-3 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Pause a range (e.g. a vacation)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Paused days are banked — your plan simply runs that many days longer once resumed.
                Changes need at least a day&apos;s notice, so the earliest start is{" "}
                {new Date(subscription.earliestEditableDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                .
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">From</label>
                  <input
                    type="date"
                    value={pauseFrom}
                    onChange={(e) => setPauseFrom(e.target.value)}
                    min={subscription.earliestEditableDate}
                    className="input"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">To</label>
                  <input
                    type="date"
                    value={pauseTo}
                    onChange={(e) => setPauseTo(e.target.value)}
                    min={pauseFrom || subscription.earliestEditableDate}
                    className="input"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !pauseFrom || !pauseTo}
                className="btn-primary btn-sm self-start"
              >
                Pause
              </button>
            </form>

            {subscription.canCancel && (
              <div className="card flex flex-col gap-3 p-5">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cancel</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Stops all future deliveries for this subscription immediately.
                </p>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-outline btn-sm self-start text-red-600"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function DayCard({
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
              {new Date(day.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            {day.skipped && !day.disruptionReason && (
              <span className="badge bg-zinc-100 text-zinc-500 dark:bg-zinc-800">Skipped</span>
            )}
            {day.skipped && day.disruptionReason && (
              <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Paused by the business
              </span>
            )}
            {day.isOverridden && (
              <span className="badge bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400">
                Changed
              </span>
            )}
            {day.locked && (
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
                    {meal.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meal.imageUrl}
                        alt={meal.name ?? ""}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageOff className="h-5 w-5 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">{SLOT_LABELS[meal.slotType] ?? meal.slotType}</p>
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
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

          {day.locked ? (
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
