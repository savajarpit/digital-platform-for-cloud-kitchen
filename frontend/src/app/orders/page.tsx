"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, FileText, Package } from "lucide-react";
import { ApiError, listOrders } from "@/lib/api/orders";
import { qk, STALE } from "@/lib/query/keys";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { ORDER_STATUS_STYLES } from "@/lib/format/status-styles";
import { orderStatusLabel } from "@/lib/format/order-status";
import { OrderCardSkeleton } from "@/components/orders/OrderCardSkeleton";
import { PageHeader } from "@/components/account/PageHeader";
import { formatDate } from "@/lib/format/date";

export default function OrdersPage() {
  const t = useTranslations("order");
  const [page, setPage] = useState(1);

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={Package} title={t("viewOrders")} />
      <OrdersList page={page} onPageChange={setPage} />
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
  // Cached per page: revisiting shows the last result instantly and only
  // refetches quietly once it is older than STALE.list; paging keeps the
  // previous page on screen until the next arrives (no skeleton flash).
  const { data, isPending, isError, error } = useQuery({
    queryKey: qk.orders.list(page),
    queryFn: () => listOrders({ page }),
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.push("/login?redirect=/orders");
  }, [unauthorized, router]);

  if (isPending || unauthorized) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Package}
        title="Couldn't load your orders"
        description="Please try again in a moment."
      />
    );
  }

  const orders = data.data;
  const meta = data.meta;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet."
        action={
          <Link href="/menu" className="btn-primary">
            {t("backToMenu")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="card flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:border-primary-300 md:flex-row md:items-center"
        >
          <Link
            href={`/orders/${order.id}`}
            className="flex w-full flex-1 flex-col justify-between gap-3 md:flex-row md:items-center"
          >
            <div>
              <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                {order.orderNumber}
              </p>
              {order.planDelivery && (
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Plan delivery · {order.planDelivery.planName}
                  {order.planDelivery.dayLabel && `, ${order.planDelivery.dayLabel}`}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-400">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="text-left md:text-right">
              {/* A plan delivery was paid for with the plan — no price of its own. */}
              {order.planDelivery ? (
                <p className="text-sm font-medium text-primary-700 dark:text-primary-400">In your plan</p>
              ) : (
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPriceFromPaise(order.totalInPaise)}
                </p>
              )}
              <span
                className={`badge mt-1 ${ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.CONFIRMED}`}
              >
                {orderStatusLabel(order.status, order.fulfillmentType)}
              </span>
            </div>
          </Link>
          {!order.planDelivery && (
          <Link
            href={`/orders/${order.id}/invoice`}
            className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-primary-600 dark:hover:bg-zinc-800"
            aria-label={tInvoice("downloadInvoice")}
            title={tInvoice("downloadInvoice")}
          >
            <FileText className="h-4 w-4" />
          </Link>
          )}
        </div>
      ))}

      {meta && meta.totalPages > 1 && (
        <div className="col-span-full mt-2 flex items-center justify-between px-1">
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
