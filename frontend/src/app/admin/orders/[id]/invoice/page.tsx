"use client";

import { Fragment, use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getAdminOrder } from "@/lib/api/admin-orders";
import { fetchPublicConfig } from "@/lib/api/settings-client";
import { qk, STALE } from "@/lib/query/keys";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { InvoiceSkeleton } from "@/components/admin/InvoiceSkeleton";
import { formatDate } from "@/lib/format/date";

export default function AdminOrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Same key as the order detail page, so opening the invoice from there is instant.
  const orderQuery = useQuery({
    queryKey: qk.admin("orders", "detail", id),
    queryFn: () => getAdminOrder(id),
    staleTime: STALE.short,
  });
  const configQuery = useQuery({
    queryKey: qk.admin("settings", "public-config"),
    queryFn: fetchPublicConfig,
    staleTime: STALE.long,
  });
  const order = orderQuery.data;
  const config = configQuery.data;

  if (orderQuery.isError || configQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Order not found.</p>
        <Link href="/admin/orders" className="btn-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order || !config) return <InvoiceSkeleton />;

  // A plan delivery was paid for with the plan — its bill is the plan's invoice.
  if (order.planDelivery) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          This delivery is part of a meal plan and has no bill of its own.
        </p>
        <Link href={`/admin/subscriptions/${order.planDelivery.subscriptionId}/invoice`} className="btn-primary">
          View plan invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="print:py-0">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/admin/orders/${id}`}
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

      <div className="card mt-6 p-8 print:mt-0 print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 print:border-zinc-300">
          <div className="min-w-0 max-w-xs">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={config.displayName} className="h-10 w-auto" />
            ) : (
              <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                {config.displayName}
              </h2>
            )}
            {config.addressLine1 && (
              <p className="mt-1 text-xs wrap-break-word text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                {config.addressLine1}
              </p>
            )}
            {config.supportEmail && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
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
              Invoice
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              Order: <span className="font-mono">{order.orderNumber}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              Date: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              Billed to
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 print:text-black">
              {order.user ? `${order.user.firstName} ${order.user.lastName ?? ""}` : order.guestName?.trim() || "Walk-in guest"}
            </p>
            {order.user ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 print:text-black">{order.user.email}</p>
            ) : (
              order.guestPhone && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300 print:text-black">{order.guestPhone}</p>
              )
            )}
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 print:text-black">
              {order.fulfillmentType === "PICKUP"
                ? `Pickup: ${order.pickupKitchenZone?.pickupAddress ?? "—"}`
                : order.fulfillmentType === "DINE_IN" || order.fulfillmentType === "TAKEAWAY"
                  ? [order.tableLabelSnapshot ? `Table ${order.tableLabelSnapshot}` : null, order.dineInKitchenZone?.name]
                      .filter(Boolean)
                      .join(" — ")
                  : `${order.address!.line1}${order.address!.line2 ? `, ${order.address!.line2}` : ""}, ${order.address!.city}, ${order.address!.state} — ${order.address!.pincode}`}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              Payment status
            </h3>
            <span
              className={`badge ${
                order.paymentStatus === "PAID"
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400 print:border-zinc-300 print:text-zinc-600">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const addonUnitTotal = (item.addons ?? []).reduce(
                (sum, a) => sum + a.priceInPaiseSnapshot * a.quantity,
                0,
              );
              return (
                <Fragment key={item.id}>
                  <tr className="border-b border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 print:border-zinc-200 print:text-black">
                    <td className="py-2.5">{item.nameSnapshot}</td>
                    <td className="py-2.5 text-center">{item.quantity}</td>
                    <td className="py-2.5 text-right">
                      {formatPriceFromPaise(item.priceInPaiseSnapshot + addonUnitTotal)}
                    </td>
                    <td className="py-2.5 text-right">
                      {formatPriceFromPaise((item.priceInPaiseSnapshot + addonUnitTotal) * item.quantity)}
                    </td>
                  </tr>
                  {item.addons?.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 print:border-zinc-200 print:text-zinc-600"
                    >
                      <td className="py-1 pl-4 wrap-break-word">+ {a.nameSnapshot}</td>
                      <td className="py-1 text-center">{a.quantity}</td>
                      <td className="py-1 text-right">{formatPriceFromPaise(a.priceInPaiseSnapshot)}</td>
                      <td className="py-1 text-right" />
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="mt-4 ml-auto flex max-w-60 flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
            <span>Subtotal</span>
            <span>{formatPriceFromPaise(order.subtotalInPaise)}</span>
          </div>
          {order.discountInPaise > 0 && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatPriceFromPaise(order.discountInPaise)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
            <span>Delivery fee</span>
            <span>{formatPriceFromPaise(order.deliveryFeeInPaise)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1.5 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 print:border-zinc-300 print:text-black">
            <span>Total</span>
            <span>{formatPriceFromPaise(order.totalInPaise)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
