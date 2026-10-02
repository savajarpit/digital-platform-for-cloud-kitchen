"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, FileText } from "lucide-react";
import {
  ApiError,
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
import { CancellationRequestStatusNote } from "@/components/cancellations/CancellationRequestStatusNote";
import { SubscriptionDetailSkeleton } from "@/components/subscriptions/SubscriptionDetailSkeleton";
import { PlanViewTabs, type PlanViewTab } from "@/components/subscriptions/PlanViewTabs";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";

/** "Mon, 5 Oct" for a tenant-local YYYY-MM-DD (UTC-parsed so it never shifts a day). */
function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

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
  const [tab, setTab] = useState<PlanViewTab>("calendar");
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

  // Skip and pause can't be undone by the customer, so both ask first.
  function handleSkip(date: string) {
    confirm({
      title: "Skip this delivery?",
      message: `There'll be no delivery on ${formatDay(date)}. The day is added back at the end of your plan. This can't be undone.`,
      confirmLabel: "Skip delivery",
      processingLabel: "Skipping…",
      onConfirm: async () => {
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
      },
    });
  }

  function handlePause(e: React.FormEvent) {
    e.preventDefault();
    if (!pauseFrom || !pauseTo) return;
    const range =
      pauseFrom === pauseTo ? formatDay(pauseFrom) : `${formatDay(pauseFrom)} to ${formatDay(pauseTo)}`;
    confirm({
      title: "Pause deliveries?",
      message: `No deliveries from ${range}. Those days are added back at the end of your plan. This can't be undone.`,
      confirmLabel: "Pause",
      processingLabel: "Pausing…",
      onConfirm: async () => {
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
      },
    });
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

      {subscription.cancellationRequest && (
        <div className="mt-6">
          <CancellationRequestStatusNote
            request={subscription.cancellationRequest}
            onChanged={() => void refresh()}
          />
        </div>
      )}

      {isActive && (
        <div className="mt-6 flex flex-col gap-6">
          {subscription.viewMode === "BOTH" && (
            <div className="-mb-4 self-start">
              <PlanViewTabs tab={tab} onChange={setTab} />
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
            onCancellationChanged={() => void refresh()}
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
