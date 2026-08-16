"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import {
  ADMIN_SETTABLE_STATUSES,
  ApiError,
  listAdminOrders,
  updateOrderStatus,
  type AdminOrder,
  type AdminOrdersMeta,
} from "@/lib/api/admin-orders";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { formatPriceFromPaise } from "@/lib/format/currency";

const ALL_STATUSES = [
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PREPARING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  OUT_FOR_DELIVERY: "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  DELIVERED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export default function AdminOrdersPage() {
  const canEdit = usePermission(PERMISSIONS.ORDERS_MANAGE);
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-600">
          <Package className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Orders
          </h2>
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!canEdit && <ViewOnlyNotice />}

      {/* Keyed by page+status so switching either remounts fresh (starts at
          null again) instead of a synchronous setState-to-null in an effect. */}
      <OrdersTable
        key={`${page}-${status}`}
        page={page}
        status={status}
        canEdit={canEdit}
        onPageChange={setPage}
      />
    </div>
  );
}

function OrdersTable({
  page,
  status,
  canEdit,
  onPageChange,
}: {
  page: number;
  status: string;
  canEdit: boolean;
  onPageChange: (page: number) => void;
}) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [meta, setMeta] = useState<AdminOrdersMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminOrders({ page, status: status || undefined })
      .then(({ data, meta }) => {
        setOrders(data);
        setMeta(meta ?? null);
      })
      .catch(() => setError("Couldn't load orders."));
  }, [page, status]);

  async function handleStatusChange(order: AdminOrder, newStatus: string) {
    const prevOrders = orders;
    setOrders((prev) =>
      prev ? prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)) : prev,
    );
    try {
      await updateOrderStatus(order.id, newStatus);
      showToast("Order status updated", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update order status.", "error");
      setOrders(prevOrders);
    }
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (!orders) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-5 py-3">Order</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Delivery</th>
            <th className="px-5 py-3">Total</th>
            <th className="px-5 py-3">Payment</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isPaid = order.paymentStatus === "PAID";
            const isFinal = order.status === "DELIVERED" || order.status === "CANCELLED";
            return (
              <tr key={order.id} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300">
                  <p>
                    {order.user.firstName} {order.user.lastName ?? ""}
                  </p>
                  <p className="text-xs text-zinc-400">{order.user.email}</p>
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {order.deliverySlotName} ·{" "}
                  {new Date(order.deliveryDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {formatPriceFromPaise(order.totalInPaise)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`badge ${
                      isPaid
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {canEdit && isPaid && !isFinal ? (
                    <Select value={order.status} onValueChange={(v) => handleStatusChange(order, v)}>
                      <SelectTrigger
                        variant="unstyled"
                        className={`badge border-0 ${STATUS_STYLES[order.status] ?? ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={order.status}>{order.status.replace(/_/g, " ")}</SelectItem>
                        {ADMIN_SETTABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`badge ${STATUS_STYLES[order.status] ?? ""}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {meta.page} of {meta.totalPages} · {meta.total} orders
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={!meta.hasPrev}
              className="btn-ghost btn-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!meta.hasNext}
              className="btn-ghost btn-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
