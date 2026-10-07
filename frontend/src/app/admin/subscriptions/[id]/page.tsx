"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, MapPin, Phone, User } from "lucide-react";
import {
  ApiError,
  getAdminSubscription,
  markSubscriptionPaid,
} from "@/lib/api/admin-subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateSubscriptionAreas } from "@/lib/query/subscription-invalidation";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapLink } from "@/components/ui/MapLink";
import { PlanDayBreakdown } from "@/components/admin/PlanDayBreakdown";
import { ShareAddressButton } from "@/components/ui/ShareAddressButton";
import { DeclareDisruptionForm } from "@/components/admin/DeclareDisruptionForm";
import { SubscriptionActionsForm } from "@/components/admin/SubscriptionActionsForm";
import { CancelRefundForm } from "@/components/admin/CancelRefundForm";
import { CANCEL_REFUND_ANCHOR, PendingCancellationBanner } from "@/components/admin/PendingCancellationBanner";
import { RefundHistoryCard } from "@/components/admin/RefundHistoryCard";
import { SubscriptionSkipsCard } from "@/components/admin/SubscriptionSkipsCard";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";
import { formatDate } from "@/lib/format/date";

const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export default function AdminSubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canCancelRefund = usePermission(PERMISSIONS.SUBSCRIPTIONS_CANCEL_REFUND);
  const canActOnBehalf = usePermission(PERMISSIONS.SUBSCRIPTIONS_ACT_ON_BEHALF);
  const canRecordPayment = usePermission(PERMISSIONS.PAYMENTS_MANUAL_RECORD);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [markingPaid, setMarkingPaid] = useState(false);
  const { data: sub, isError: notFound } = useQuery({
    queryKey: qk.admin("subscriptions", "detail", id),
    queryFn: () => getAdminSubscription(id),
    staleTime: STALE.short,
  });

  // Any write here can change the list, analytics and invoice too.
  function refresh() {
    void invalidateSubscriptionAreas(queryClient);
  }

  async function handleMarkPaid() {
    if (!sub) return;
    setMarkingPaid(true);
    try {
      await markSubscriptionPaid(sub.id);
      showToast("Subscription marked as paid and activated", "success");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't mark this subscription as paid.", "error");
    } finally {
      setMarkingPaid(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Subscription not found.</p>
        <Link href="/admin/subscriptions" className="btn-primary">
          Back to subscriptions
        </Link>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex flex-col gap-2 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="card flex flex-col gap-3 p-6">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/subscriptions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to subscriptions
      </Link>

      {sub.status === "ACTIVE" && (
        <PendingCancellationBanner
          kind="SUBSCRIPTION"
          targetId={sub.id}
          canDecide={canCancelRefund}
          onChanged={refresh}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {sub.planNameSnapshot}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Subscribed {formatDate(sub.createdAt)}
          </p>
        </div>
        {/* Wraps: an opened action form takes its own full-width row. */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 has-[.basis-full]:basis-full">
          {sub.paymentMethod !== "RAZORPAY" && (
            <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {sub.paymentMethod}
            </span>
          )}
          <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[sub.status] ?? ""}`}>
            {sub.status.replace("_", " ")}
          </span>
          {canRecordPayment && sub.paymentMethod !== "RAZORPAY" && sub.status === "PENDING_PAYMENT" && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={markingPaid}
              className="btn-primary btn-sm cursor-pointer"
            >
              {markingPaid ? "Marking…" : "Mark Paid"}
            </button>
          )}
          {sub.status === "ACTIVE" && (
            <DeclareDisruptionForm scope="SINGLE" subscriptionId={sub.id} onDeclared={refresh} />
          )}
          {canActOnBehalf && sub.status === "ACTIVE" && (
            <SubscriptionActionsForm
              subscriptionId={sub.id}
              customerUserId={sub.userId}
              deliverySlots={sub.canOverrideTime ? sub.deliverySlots : []}
              onDone={refresh}
            />
          )}
          {canCancelRefund && sub.status === "ACTIVE" && (
            <div id={CANCEL_REFUND_ANCHOR} className="scroll-mt-24 has-[.basis-full]:basis-full">
              <CancelRefundForm
                kind="subscription"
                id={sub.id}
                defaultAmountInPaise={sub.priceInPaiseSnapshot}
                onCancelled={refresh}
              />
            </div>
          )}
        </div>
      </div>

      <RefundHistoryCard
        cancelledAt={sub.cancelledAt}
        cancellationReason={sub.cancellationReason}
        refunds={sub.refunds}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-2 p-6">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <User className="h-4 w-4" />
            Subscriber
          </h3>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {sub.user.firstName} {sub.user.lastName ?? ""}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub.user.email}</p>
          {sub.user.phone && <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub.user.phone}</p>}
        </div>

        <div className="card flex flex-col gap-2 p-6 text-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cycle</h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            {sub.startDate ? formatDate(sub.startDate) : "—"}
            {" – "}
            {sub.cycleEnd ? formatDate(sub.cycleEnd) : "—"}
          </p>
          <p className="text-xs text-zinc-400">
            {sub.durationDaysSnapshot} days
            {sub.plan.schedulingMode === "RELATIVE_DAY" && ` · next delivery day ${sub.nextPlanDayNumber}`}
            {sub.bankedDays > 0 && ` · ${sub.bankedDays} banked`}
          </p>
          {sub.couponCode && (
            <p className="text-xs text-zinc-400">
              Coupon: <span className="font-mono">{sub.couponCode}</span>
              {sub.bonusDaysGranted > 0 && ` (+${sub.bonusDaysGranted}d)`}
            </p>
          )}
          <p className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
            {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
          </p>
        </div>

        <div className="card flex flex-col gap-2 p-6 text-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery</h3>
          {sub.address ? (
            <div className="flex min-w-0 items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div className="min-w-0">
                <span className="wrap-break-word">
                  {sub.address.line1}
                  {sub.address.line2 ? `, ${sub.address.line2}` : ""}, {sub.address.city}, {sub.address.state} —{" "}
                  {sub.address.pincode}
                </span>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                  <MapLink lat={sub.address.lat} lng={sub.address.lng} />
                  <ShareAddressButton
                    address={{ ...sub.address, label: undefined }}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No address on file.</p>
          )}
          {sub.address && (
            <div className="flex min-w-0 items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Phone className="h-4 w-4 shrink-0 text-primary-600" />
              <span className="wrap-break-word">{sub.address.contactPhone}</span>
            </div>
          )}
          {sub.deliverySlot && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Clock className="h-4 w-4 shrink-0 text-primary-600" />
              <span>
                {sub.deliverySlot.name} ({formatTime12h(sub.deliverySlot.startTime)}–
                {formatTime12h(sub.deliverySlot.endTime)})
              </span>
            </div>
          )}
        </div>
      </div>

      {sub.invoice && (
        <div className="card flex flex-col gap-1.5 p-6 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h3>
            <Link href={`/admin/subscriptions/${sub.id}/invoice`} className="btn-outline btn-sm">
              <FileText className="h-4 w-4" />
              Invoice
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatPriceFromPaise(sub.invoice.amountInPaise)}
            </span>
            <span
              className={`badge ${
                sub.invoice.status === "PAID"
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {sub.invoice.status}
            </span>
          </div>
          <p className="font-mono text-xs text-zinc-400">Order: {sub.invoice.razorpayOrderId}</p>
          {sub.invoice.razorpayPaymentId && (
            <p className="font-mono text-xs text-zinc-400">Payment: {sub.invoice.razorpayPaymentId}</p>
          )}
        </div>
      )}

      <SubscriptionSkipsCard skips={sub.skips} dayOverrides={sub.dayOverrides} />

      <div className="card flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Plan details</h3>
          <Link
            href={`/admin/subscriptions/plans/${sub.plan.id}`}
            className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            View plan →
          </Link>
        </div>
        <PlanDayBreakdown days={sub.plan.days ?? []} />
      </div>
    </div>
  );
}
