"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, FileText } from "lucide-react";
import {
  ApiError,
  cancelSubscription,
  getMySubscription,
  pauseSubscription,
  setDayOverride,
  skipDay,
} from "@/lib/api/subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubscriptionDayCard } from "@/components/subscriptions/SubscriptionDayCard";
import { SubscriptionDetailSkeleton } from "@/components/subscriptions/SubscriptionDetailSkeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Status and upcoming days change while a customer manages the plan, so it
  // is only fresh briefly; the cached copy still renders instantly.
  const {
    data: subscription,
    isPending,
    error,
  } = useQuery({
    queryKey: qk.subscriptions.detail(id),
    queryFn: () => getMySubscription(id),
    staleTime: STALE.short,
  });
  const unauthorized = error instanceof ApiError && error.status === 401;

  const [pauseFrom, setPauseFrom] = useState("");
  const [pauseTo, setPauseTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    if (unauthorized) router.push(`/login?redirect=/account/subscriptions/${id}`);
  }, [unauthorized, id, router]);

  // Every mutation below changes this subscription, so refresh the whole
  // subscriptions domain (this detail + the list) once it succeeds.
  function refresh() {
    return queryClient.invalidateQueries({ queryKey: qk.subscriptions.all });
  }

  async function handleSkip(date: string) {
    setBusy(true);
    try {
      await skipDay(id, date);
      showToast("Day skipped — pushed to the end of your plan.", "success");
      await refresh();
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
      await refresh();
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
      await refresh();
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
          await refresh();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't cancel.", "error");
        }
      },
    });
  }

  if (!subscription) {
    if (isPending || unauthorized) return <SubscriptionDetailSkeleton />;
    return (
      <main className="container-app flex-1 py-10">
        <EmptyState
          icon={CalendarClock}
          title="Subscription not found"
          action={
            <Link href="/account/subscriptions" className="btn-primary">
              Back to my subscriptions
            </Link>
          }
        />
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
                  <SubscriptionDayCard
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
