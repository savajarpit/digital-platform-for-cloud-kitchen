"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, ChevronLeft, FileText, List } from "lucide-react";
import {
  ApiError,
  cancelSubscription,
  getMySubscription,
  moveDeliveryDate,
  pauseSubscription,
  setDayOverride,
  skipDay,
} from "@/lib/api/subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { UpcomingDaysList } from "@/components/subscriptions/UpcomingDaysList";
import { SubscriptionCalendarSection } from "@/components/subscriptions/SubscriptionCalendarSection";
import { MoveDeliveryDateModal } from "@/components/subscriptions/MoveDeliveryDateModal";
import { SubscriptionPauseAndCancel } from "@/components/subscriptions/SubscriptionPauseAndCancel";
import { SubscriptionDetailSkeleton } from "@/components/subscriptions/SubscriptionDetailSkeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";

const TAB_BASE =
  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors";

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
  const [tab, setTab] = useState<"calendar" | "list">("calendar");
  const [movingDate, setMovingDate] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

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

  async function handleConfirmMove(newDate: string) {
    if (!movingDate) return;
    setMoving(true);
    try {
      await moveDeliveryDate(id, movingDate, newDate);
      showToast("Delivery moved to the new date.", "success");
      setMovingDate(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't move that delivery.", "error");
    } finally {
      setMoving(false);
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
        <div className="mt-6 flex flex-col gap-6">
          {subscription.viewMode === "BOTH" && (
            <div role="tablist" aria-label="View" className="inline-flex w-fit rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              {(
                [
                  { id: "calendar", label: "Calendar", Icon: CalendarDays },
                  { id: "list", label: "List", Icon: List },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`${TAB_BASE} ${
                    tab === id
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {subscription.viewMode === "ACCORDION" || (subscription.viewMode === "BOTH" && tab === "list") ? (
            <UpcomingDaysList
              subscription={subscription}
              expandedDate={expandedDate}
              busy={busy}
              onToggle={(date) => setExpandedDate(expandedDate === date ? null : date)}
              onSkip={handleSkip}
              onSaveOverride={handleDayOverrideSave}
            />
          ) : (
            <SubscriptionCalendarSection
              subscription={subscription}
              busy={busy}
              onSkip={handleSkip}
              onSaveOverride={handleDayOverrideSave}
              onOpenMove={setMovingDate}
            />
          )}

          <SubscriptionPauseAndCancel
            subscription={subscription}
            pauseFrom={pauseFrom}
            pauseTo={pauseTo}
            busy={busy}
            onPauseFromChange={setPauseFrom}
            onPauseToChange={setPauseTo}
            onPause={handlePause}
            onCancel={handleCancel}
          />
        </div>
      )}

      {movingDate && (
        <MoveDeliveryDateModal
          subscriptionId={id}
          date={movingDate}
          moving={moving}
          onClose={() => setMovingDate(null)}
          onConfirm={handleConfirmMove}
        />
      )}
    </main>
  );
}
