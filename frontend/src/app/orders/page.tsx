"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, FileText, Package } from "lucide-react";
import { ApiError, listOrders, type Order, type OrdersMeta } from "@/lib/api/orders";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { ORDER_STATUS_STYLES } from "@/lib/format/status-styles";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";
import { PageHeader } from "@/components/account/PageHeader";

export default function OrdersPage() {
  const t = useTranslations("order");
  const [page, setPage] = useState(1);

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={Package} title={t("viewOrders")} />
      {/* Keyed by page so switching pages remounts fresh (starts at null
          again) instead of a synchronous setState-to-null in an effect. */}
      <OrdersList key={page} page={page} onPageChange={setPage} />
    </main>
  );
}

function OrdersList({
  page,
  onPageChange,
}: {
  page: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("order");
  const tInvoice = useTranslations("invoice");
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [meta, setMeta] = useState<OrdersMeta | null>(null);

  useEffect(() => {
    listOrders({ page })
      .then(({ data, meta }) => {
        setOrders(data);
        setMeta(meta ?? null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/orders");
          return;
        }
        setOrders([]);
      });
  }, [page, router]);

  if (orders === null) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <Package className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders yet.</p>
        <Link href="/menu" className="btn-primary">
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="card flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:border-primary-300 sm:flex-row sm:items-center"
        >
          <Link
            href={`/orders/${order.id}`}
            className="flex w-full flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                {order.orderNumber}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatPriceFromPaise(order.totalInPaise)}
              </p>
              <span
                className={`badge mt-1 ${ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.CONFIRMED}`}
              >
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
          </Link>
          <Link
            href={`/orders/${order.id}/invoice`}
            className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600 dark:hover:bg-zinc-800"
            aria-label={tInvoice("downloadInvoice")}
            title={tInvoice("downloadInvoice")}
          >
            <FileText className="h-4 w-4" />
          </Link>
        </div>
      ))}

      {meta && meta.totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {meta.page} of {meta.totalPages} · {meta.total} orders
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={!meta.hasPrev}
              className="btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!meta.hasNext}
              className="btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
