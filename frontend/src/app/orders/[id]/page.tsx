"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, MapPin, Package, Phone } from "lucide-react";
import { ApiError, getOrder, type Order } from "@/lib/api/orders";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("order");
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?redirect=/orders/${id}`);
          return;
        }
        setNotFound(true);
      });
  }, [id, router]);

  if (notFound) {
    return (
      <main className="container-app flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Order not found.</p>
        <Link href="/menu" className="btn-primary">
          {t("backToMenu")}
        </Link>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="container-app flex-1 py-16">
        <div className="card mx-auto max-w-xl p-8">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-6 w-48" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </div>
      </main>
    );
  }

  const isPaid = order.paymentStatus === "PAID";

  return (
    <main className="container-app flex-1 py-16">
      <div className="card mx-auto max-w-xl p-8 text-center">
        {isPaid ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary-600" />
            <h1 className="font-display mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("confirmedTitle")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("confirmedSubtitle")}</p>
          </>
        ) : (
          <>
            <Package className="mx-auto h-12 w-12 text-zinc-400" />
            <h1 className="font-display mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {order.status.replace(/_/g, " ")}
            </h1>
          </>
        )}

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {t("orderNumber")}: <span className="font-mono">{order.orderNumber}</span>
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800">
          <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <span>
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city},{" "}
              {order.address.state} — {order.address.pincode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Phone className="h-4 w-4 shrink-0 text-primary-600" />
            <span>{order.address.contactPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Clock className="h-4 w-4 shrink-0 text-primary-600" />
            <span>{new Date(order.requestedDeliveryTime).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800">
          <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{t("items")}</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>
                {item.nameSnapshot} × {item.quantity}
              </span>
              <span>{formatPriceFromPaise(item.priceInPaiseSnapshot * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
            <span>Total</span>
            <span>{formatPriceFromPaise(order.totalInPaise)}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link href="/orders" className="btn-outline">
            {t("viewOrders")}
          </Link>
          <Link href="/menu" className="btn-primary">
            {t("backToMenu")}
          </Link>
        </div>
      </div>
    </main>
  );
}
