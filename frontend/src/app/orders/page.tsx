"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { ApiError, listOrders, type Order } from "@/lib/api/orders";
import { formatPriceFromPaise } from "@/lib/format/currency";

export default function OrdersPage() {
  const t = useTranslations("order");
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/orders");
          return;
        }
        setOrders([]);
      });
  }, [router]);

  return (
    <main className="container-app flex-1 py-10">
      <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("viewOrders")}</h1>

      {orders === null ? null : orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Package className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders yet.</p>
          <Link href="/menu" className="btn-primary">
            {t("backToMenu")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="card flex items-center justify-between p-5 transition-colors hover:border-primary-300"
            >
              <div>
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                  {order.orderNumber}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPriceFromPaise(order.totalInPaise)}
                </p>
                <span className="badge mt-1 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
