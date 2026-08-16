"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Phone, User } from "lucide-react";
import { getAdminSubscription, type AdminSubscriptionDetail } from "@/lib/api/admin-subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanDayBreakdown } from "@/components/admin/PlanDayBreakdown";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export default function AdminSubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sub, setSub] = useState<AdminSubscriptionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getAdminSubscription(id)
      .then(setSub)
      .catch(() => setNotFound(true));
  }, [id]);

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
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {sub.planNameSnapshot}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Subscribed {new Date(sub.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[sub.status] ?? ""}`}>
          {sub.status.replace("_", " ")}
        </span>
      </div>

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
            {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
            {" – "}
            {sub.cycleEnd ? new Date(sub.cycleEnd).toLocaleDateString() : "—"}
          </p>
          <p className="text-xs text-zinc-400">
            {sub.durationDaysSnapshot} days · next delivery day {sub.nextPlanDayNumber}
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
            <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <span>
                {sub.address.line1}
                {sub.address.line2 ? `, ${sub.address.line2}` : ""}, {sub.address.city}, {sub.address.state} —{" "}
                {sub.address.pincode}
              </span>
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No address on file.</p>
          )}
          {sub.address && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Phone className="h-4 w-4 shrink-0 text-primary-600" />
              <span>{sub.address.contactPhone}</span>
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
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h3>
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

      {(sub.skips.length > 0 || sub.dayOverrides.length > 0) && (
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Skips &amp; changes</h3>
          {sub.skips.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Skipped / paused</p>
              <div className="flex flex-wrap gap-1.5">
                {sub.skips.map((skip) => (
                  <span key={skip.id} className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {skip.dateFrom === skip.dateTo ? skip.dateFrom : `${skip.dateFrom} – ${skip.dateTo}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          {sub.dayOverrides.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Per-day changes</p>
              <div className="flex flex-wrap gap-1.5">
                {sub.dayOverrides.map((o) => (
                  <span key={o.id} className="badge bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400">
                    {o.date}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
