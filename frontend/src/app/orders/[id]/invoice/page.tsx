"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Printer } from "lucide-react";
import { ApiError, getOrder, type Order } from "@/lib/api/orders";
import { fetchPublicConfig, type PublicConfig } from "@/lib/api/settings-client";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("invoice");
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([getOrder(id), fetchPublicConfig()])
      .then(([o, c]) => {
        setOrder(o);
        setConfig(c);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?redirect=/orders/${id}/invoice`);
          return;
        }
        setNotFound(true);
      });
  }, [id, router]);

  if (notFound) {
    return (
      <main className="container-app flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Order not found.</p>
        <Link href="/orders" className="btn-primary">
          {t("back")}
        </Link>
      </main>
    );
  }

  if (!order || !config) {
    return (
      <main className="container-app flex-1 py-10">
        <div className="card mx-auto max-w-2xl p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-32 w-full" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="container-app flex-1 py-10 print:py-0">
      <div className="mx-auto flex max-w-2xl items-center justify-between print:hidden">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          {t("print")}
        </button>
      </div>

      <div className="card mx-auto mt-6 max-w-2xl p-8 print:mt-0 print:border-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 print:border-zinc-300">
          <div>
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={config.displayName} className="h-10 w-auto" />
            ) : (
              <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                {config.displayName}
              </h2>
            )}
            {config.addressLine1 && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                {config.addressLine1}
              </p>
            )}
            {config.supportEmail && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
                {config.supportEmail}
              </p>
            )}
          </div>
          <div className="text-right">
            <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
              {t("title")}
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              {t("orderNumber")}: <span className="font-mono">{order.orderNumber}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 print:text-zinc-600">
              {t("orderDate")}: {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              {t("deliverTo")}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 print:text-black">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city},{" "}
              {order.address.state} — {order.address.pincode}
            </p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 print:text-black">
              {order.address.contactPhone}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 print:text-zinc-600">
              {t("paymentStatus")}
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

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400 print:border-zinc-300 print:text-zinc-600">
              <th className="pb-2">{t("item")}</th>
              <th className="pb-2 text-center">{t("qty")}</th>
              <th className="pb-2 text-right">{t("price")}</th>
              <th className="pb-2 text-right">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 print:border-zinc-200 print:text-black"
              >
                <td className="py-2.5">{item.nameSnapshot}</td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatPriceFromPaise(item.priceInPaiseSnapshot)}</td>
                <td className="py-2.5 text-right">
                  {formatPriceFromPaise(item.priceInPaiseSnapshot * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto flex max-w-60 flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
            <span>{t("subtotal")}</span>
            <span>{formatPriceFromPaise(order.subtotalInPaise)}</span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
            <span>{t("deliveryFee")}</span>
            <span>{formatPriceFromPaise(order.deliveryFeeInPaise)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1.5 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 print:border-zinc-300 print:text-black">
            <span>{t("total")}</span>
            <span>{formatPriceFromPaise(order.totalInPaise)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
