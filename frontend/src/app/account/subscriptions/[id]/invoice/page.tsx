"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { ApiError, getSubscriptionInvoice } from "@/lib/api/subscriptions";
import { fetchPublicConfig } from "@/lib/api/settings-client";
import { qk, STALE } from "@/lib/query/keys";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { InvoiceSkeleton } from "@/components/invoice/InvoiceSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format/date";

export default function SubscriptionInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, error } = useQuery({
    queryKey: qk.subscriptions.invoice(id),
    queryFn: () => getSubscriptionInvoice(id),
    staleTime: STALE.list,
  });
  // Branding rarely changes and fetchPublicConfig falls back on failure.
  const { data: config } = useQuery({
    queryKey: qk.config.public,
    queryFn: fetchPublicConfig,
    staleTime: STALE.long,
  });
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.push(`/login?redirect=/account/subscriptions/${id}/invoice`);
  }, [unauthorized, id, router]);

  if (!data || !config) {
    if (error && !unauthorized) {
      return (
        <main className="container-app flex-1 py-10">
          <EmptyState
            icon={FileText}
            title="Invoice not found."
            action={
              <Link href="/account/subscriptions" className="btn-primary">
                Back
              </Link>
            }
          />
        </main>
      );
    }
    return <InvoiceSkeleton itemRows={1} summaryRows={1} wideTable={false} />;
  }

  const { invoice, subscription } = data;

  return (
    <main className="container-app flex-1 py-10 print:py-0">
      <div className="mx-auto flex max-w-2xl items-center justify-between print:hidden">
        <Link
          href={`/account/subscriptions/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="card mx-auto mt-6 max-w-2xl p-8 print:mt-0 print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 print:border-zinc-300">
          <div className="min-w-0 max-w-xs">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={config.displayName} className="h-10 w-auto" />
            ) : (
              <h2 className="wrap-break-word font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                {config.displayName}
              </h2>
            )}
            {config.addressLine1 && (
              <p className="mt-1 text-xs wrap-break-word text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                {config.addressLine1}
              </p>
            )}
            {config.supportEmail && (
              <p className="wrap-break-word text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                {config.supportEmail}
              </p>
            )}
            {config.fssaiLicenseNumber && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                FSSAI Lic. No: {config.fssaiLicenseNumber}
              </p>
            )}
          </div>
          <div className="text-right">
            <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
              Subscription Invoice
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              Payment ID: <span className="font-mono">{invoice.razorpayPaymentId ?? "—"}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              Date: {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              Delivery address
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 print:text-black">
              {subscription.address.line1}
              {subscription.address.line2 ? `, ${subscription.address.line2}` : ""}, {subscription.address.city},{" "}
              {subscription.address.state} — {subscription.address.pincode}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              Payment status
            </h3>
            <span
              className={`badge ${
                invoice.status === "PAID"
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400 print:border-zinc-300 print:text-zinc-600">
              <th className="pb-2">Plan</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 print:border-zinc-200 print:text-black">
              <td className="py-2.5">
                {subscription.planNameSnapshot}
                {subscription.couponCode ? (
                  <span className="ml-2 text-xs text-zinc-400">Coupon: {subscription.couponCode}</span>
                ) : null}
              </td>
              <td className="py-2.5 text-right">{formatPriceFromPaise(invoice.amountInPaise)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 ml-auto flex max-w-60 flex-col gap-1.5 text-sm">
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1.5 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 print:border-zinc-300 print:text-black">
            <span>Total</span>
            <span>{formatPriceFromPaise(invoice.amountInPaise)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
