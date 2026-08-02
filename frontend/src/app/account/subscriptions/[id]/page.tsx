"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, SkipForward } from "lucide-react";
import {
  ApiError,
  cancelSubscription,
  getMySubscription,
  pauseSubscription,
  skipDay,
  type SubscriptionDetail,
} from "@/lib/api/subscriptions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";

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

      <div className="card flex flex-col gap-2 p-6">
        <div className="flex items-center gap-2 text-primary-600">
          <CalendarClock className="h-5 w-5" />
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {subscription.planNameSnapshot}
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatPriceFromPaise(subscription.priceInPaiseSnapshot)} · Status: {subscription.status}
          {subscription.cycleEnd &&
            ` · Active through ${new Date(subscription.cycleEnd).toLocaleDateString()}`}
          {subscription.bankedDays > 0 && ` · ${subscription.bankedDays} day(s) banked`}
        </p>
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
                  <div
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
                  >
                    <div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {day.skipped ? (
                        <p className="text-xs text-zinc-400">Skipped</p>
                      ) : day.meals.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">Meal to be announced</p>
                      ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {day.meals
                            .map((m) => `${SLOT_LABELS[m.slotType] ?? m.slotType}: ${m.name ?? "TBA"}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    {!day.skipped && (
                      <button
                        type="button"
                        onClick={() => handleSkip(day.date)}
                        disabled={busy}
                        className="btn-outline btn-sm shrink-0"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        Skip
                      </button>
                    )}
                  </div>
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
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">From</label>
                  <input
                    type="date"
                    value={pauseFrom}
                    onChange={(e) => setPauseFrom(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="input"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">To</label>
                  <input
                    type="date"
                    value={pauseTo}
                    onChange={(e) => setPauseTo(e.target.value)}
                    min={pauseFrom || new Date().toISOString().slice(0, 10)}
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

            <div className="card flex flex-col gap-3 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cancel</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Stops all future deliveries for this subscription immediately.
              </p>
              <button type="button" onClick={handleCancel} className="btn-outline btn-sm self-start text-red-600">
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
