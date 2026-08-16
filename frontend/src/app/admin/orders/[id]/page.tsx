"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, MapPin, Phone, User } from "lucide-react";
import {
  ADMIN_SETTABLE_STATUSES,
  ApiError,
  getAdminOrder,
  updateOrderStatus,
  type AdminOrderDetail,
} from "@/lib/api/admin-orders";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PREPARING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  OUT_FOR_DELIVERY: "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  DELIVERED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canEdit = usePermission(PERMISSIONS.ORDERS_MANAGE);
  const { showToast } = useToast();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getAdminOrder(id)
      .then(setOrder)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    if (!order) return;
    const prev = order;
    setOrder({ ...order, status: newStatus });
    try {
      await updateOrderStatus(order.id, newStatus);
      showToast("Order status updated", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update order status.", "error");
      setOrder(prev);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Order not found.</p>
        <Link href="/admin/orders" className="btn-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isFinal = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
        <Link href={`/admin/orders/${order.id}/invoice`} className="btn-outline btn-sm">
          <FileText className="h-4 w-4" />
          Invoice
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Order <span className="font-mono">{order.orderNumber}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${isPaid ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
          >
            {order.paymentStatus}
          </span>
          {canEdit && isPaid && !isFinal ? (
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`badge cursor-pointer border-0 ${STATUS_STYLES[order.status] ?? ""}`}
            >
              <option value={order.status}>{order.status.replace(/_/g, " ")}</option>
              {ADMIN_SETTABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : (
            <span className={`badge ${STATUS_STYLES[order.status] ?? ""}`}>
              {order.status.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Items</h3>
          <div className="flex flex-col gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>
                  {item.nameSnapshot} × {item.quantity}
                </span>
                <span>{formatPriceFromPaise(item.priceInPaiseSnapshot * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPriceFromPaise(order.subtotalInPaise)}</span>
            </div>
            {order.discountInPaise > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>-{formatPriceFromPaise(order.discountInPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Delivery fee</span>
              <span>{formatPriceFromPaise(order.deliveryFeeInPaise)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              <span>Total</span>
              <span>{formatPriceFromPaise(order.totalInPaise)}</span>
            </div>
          </div>
          {order.notes && (
            <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Notes: </span>
              {order.notes}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="card flex flex-col gap-2 p-6">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <User className="h-4 w-4" />
              Customer
            </h3>
            <Link
              href={`/admin/customers/${order.userId}`}
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {order.user.firstName} {order.user.lastName ?? ""}
            </Link>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.user.email}</p>
          </div>

          <div className="card flex flex-col gap-2 p-6 text-sm">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery</h3>
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
              <span>
                {order.isInstant
                  ? "Instant delivery"
                  : `${order.deliverySlotName} (${formatTime12h(order.deliveryWindowStart)}–${formatTime12h(order.deliveryWindowEnd)})`}
                {" · "}
                {new Date(order.deliveryDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {(order.razorpayOrderId || order.subscriptionId) && (
            <div className="card flex flex-col gap-1.5 p-6 text-xs text-zinc-500 dark:text-zinc-400">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h3>
              {order.razorpayOrderId && <p className="font-mono">Order: {order.razorpayOrderId}</p>}
              {order.razorpayPaymentId && <p className="font-mono">Payment: {order.razorpayPaymentId}</p>}
              {order.subscriptionId && (
                <Link
                  href={`/admin/subscriptions/${order.subscriptionId}`}
                  className="mt-1 text-primary-600 hover:underline dark:text-primary-400"
                >
                  From subscription delivery →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
