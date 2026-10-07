"use client";

import { Fragment, use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Clock, FileText, MapPin, Phone, User } from "lucide-react";
import {
  ApiError,
  getAdminOrder,
  getOrderCustomerLabel,
  getOrderStatusLabel,
  getSettableStatusesFor,
  canChangeOrderStatus,
  markOrderPaid,
  updateOrderStatus,
  type AdminOrderDetail,
} from "@/lib/api/admin-orders";
import { usePermission, usePermissions } from "@/context/PermissionsContext";
import { getDineInOrder } from "@/lib/api/dine-in";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { OrderDetailSkeleton } from "@/components/admin/OrderDetailSkeleton";
import { qk, STALE } from "@/lib/query/keys";
import { invalidateOrderAreas } from "@/lib/query/admin-invalidation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MapLink } from "@/components/ui/MapLink";
import { ShareAddressButton } from "@/components/ui/ShareAddressButton";
import { ShareOrderDetailsButton } from "@/components/ui/ShareOrderDetailsButton";
import { OrderStatusStepper, type OrderStatus } from "@/components/ui/OrderStatusStepper";
import { CancelRefundForm } from "@/components/admin/CancelRefundForm";
import { CancelUnpaidOrderButton } from "@/components/admin/CancelUnpaidOrderButton";
import { CANCEL_REFUND_ANCHOR, PendingCancellationBanner } from "@/components/admin/PendingCancellationBanner";
import { RefundHistoryCard } from "@/components/admin/RefundHistoryCard";
import { DineInOrderPanel } from "@/components/admin/DineInOrderPanel";
import { ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/format/status-styles";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";
import { formatDateTime } from "@/lib/format/date";

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canEdit = usePermission(PERMISSIONS.ORDERS_MANAGE);
  const canCancelRefund = usePermission(PERMISSIONS.ORDERS_CANCEL_REFUND);
  const canRecordPayment = usePermission(PERMISSIONS.PAYMENTS_MANUAL_RECORD);
  const canOrderCreate = usePermission(PERMISSIONS.DINE_IN_ORDER_CREATE);
  const canViewCustomers = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const { loading: permissionsLoading } = usePermissions();
  // Counter staff who take dine-in orders but can't manage every order: the
  // page loads through the dine-in route and links back to the floor.
  const counterOnly = !canEdit && canOrderCreate;
  const backHref = counterOnly ? "/admin/dine-in" : "/admin/orders";
  const backLabel = counterOnly ? "Back to dine-in" : "Back to orders";
  const { has: hasFeature } = useFeatures();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const detailKey = qk.admin("orders", "detail", id);
  const { data: order, isPending, isError } = useQuery({
    queryKey: detailKey,
    queryFn: () => (counterOnly ? getDineInOrder(id) : getAdminOrder(id)),
    enabled: !permissionsLoading,
    staleTime: STALE.short,
  });
  const [markingPaid, setMarkingPaid] = useState(false);
  const [dineInPaymentMethod, setDineInPaymentMethod] = useState<"CASH" | "UPI">("CASH");

  // After any write: refetch this order plus every list/summary it feeds.
  function refresh() {
    void invalidateOrderAreas(queryClient);
  }

  async function handleMarkPaid() {
    if (!order) return;
    setMarkingPaid(true);
    try {
      await markOrderPaid(order.id, isDineInLike ? dineInPaymentMethod : undefined);
      showToast("Order marked as paid", "success");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't mark this order as paid.", "error");
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!order) return;
    const prev = order;
    queryClient.setQueryData<AdminOrderDetail>(detailKey, { ...order, status: newStatus });
    try {
      await updateOrderStatus(order.id, newStatus);
      showToast("Order status updated", "success");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update order status.", "error");
      queryClient.setQueryData<AdminOrderDetail>(detailKey, prev);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Order not found.</p>
        <Link href={backHref} className="btn-primary">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (isPending) return <OrderDetailSkeleton />;

  const isPaid = order.paymentStatus === "PAID";
  const canMove = canChangeOrderStatus(order);
  // A subscription's daily delivery: no price, invoice or cancel of its own.
  const plan = order.planDelivery;
  const deliveryNote = plan ? plan.customerNote : order.notes;
  const isFinal = order.status === "DELIVERED" || order.status === "CANCELLED";
  const isDineInLike = order.fulfillmentType === "DINE_IN" || order.fulfillmentType === "TAKEAWAY";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-3">
          <ShareOrderDetailsButton
            details={{
              heading: `Order #${order.orderNumber}`,
              customerName: getOrderCustomerLabel(order),
              itemLines: order.items.map((item) => `${item.nameSnapshot} x${item.quantity}`),
              deliverySlotName: isDineInLike ? undefined : order.isInstant ? "Instant delivery" : order.deliverySlotName,
              deliveryWindowStart: isDineInLike || order.isInstant ? null : order.deliveryWindowStart,
              deliveryWindowEnd: isDineInLike || order.isInstant ? null : order.deliveryWindowEnd,
              deliveryDateLabel: isDineInLike
                ? undefined
                : new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }),
              totalLabel: plan ? "Included in plan" : formatPriceFromPaise(order.totalInPaise),
              note: [
                order.prepNotes ? `Cooking: ${order.prepNotes}` : null,
                deliveryNote ? `Delivery: ${deliveryNote}` : null,
              ]
                .filter(Boolean)
                .join(" — ") || null,
              ...(isDineInLike
                ? {
                    locationLabel: [order.tableLabelSnapshot, order.dineInKitchenZone?.name]
                      .filter(Boolean)
                      .join(" — "),
                  }
                : order.fulfillmentType === "PICKUP"
                  ? {
                      pickupAddress: order.pickupKitchenZone?.pickupAddress,
                      pickupLat: order.pickupKitchenZone?.lat,
                      pickupLng: order.pickupKitchenZone?.lng,
                    }
                  : { address: order.address! }),
            }}
          />
          {plan ? (
            <Link href={`/admin/subscriptions/${plan.subscriptionId}`} className="btn-outline btn-sm">
              <CalendarClock className="h-4 w-4" />
              View subscription
            </Link>
          ) : counterOnly ? null : (
            <Link href={`/admin/orders/${order.id}/invoice`} className="btn-outline btn-sm">
              <FileText className="h-4 w-4" />
              Invoice
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Order <span className="font-mono">{order.orderNumber}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {plan
              ? `Plan delivery · ${plan.planName}${plan.dayLabel ? `, ${plan.dayLabel}` : ""}`
              : `Placed ${formatDateTime(order.createdAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.paymentMethod !== "RAZORPAY" && (
            <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {order.paymentMethod}
            </span>
          )}
          <span
            className={`badge ${isPaid ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
          >
            {order.paymentStatus}
          </span>
          {canRecordPayment && order.paymentMethod !== "RAZORPAY" && !isPaid && order.status !== "CANCELLED" && (
            <>
              {isDineInLike && (
                <Select value={dineInPaymentMethod} onValueChange={(v) => setDineInPaymentMethod(v as "CASH" | "UPI")}>
                  <SelectTrigger className="w-24 py-1.5 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="btn-primary btn-sm cursor-pointer whitespace-nowrap"
              >
                {markingPaid ? "Marking…" : "Mark Paid"}
              </button>
            </>
          )}
          {canEdit && order.paymentMethod !== "RAZORPAY" && !isPaid && order.status !== "CANCELLED" && (
            <CancelUnpaidOrderButton orderId={order.id} orderNumber={order.orderNumber} onCancelled={refresh} />
          )}
          {canEdit && canMove && !isFinal ? (
            <Select value={order.status} onValueChange={handleStatusChange}>
              <SelectTrigger variant="unstyled" className={`badge border-0 ${STATUS_STYLES[order.status] ?? ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={order.status}>
                  {getOrderStatusLabel(order.status, order.fulfillmentType)}
                </SelectItem>
                {getSettableStatusesFor(order.fulfillmentType)
                  // A plan delivery is never cancelled on its own (skip/disruption instead).
                  .filter((s) => s !== order.status && !(plan && s === "CANCELLED"))
                  .map((s) => (
                    <SelectItem key={s} value={s}>
                      {getOrderStatusLabel(s, order.fulfillmentType)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <span className={`badge ${STATUS_STYLES[order.status] ?? ""}`}>
              {getOrderStatusLabel(order.status, order.fulfillmentType)}
            </span>
          )}
        </div>
      </div>

      {order.status !== "CANCELLED" && !counterOnly && (
        <PendingCancellationBanner
          kind="ORDER"
          targetId={order.id}
          canDecide={canCancelRefund}
          onChanged={refresh}
        />
      )}

      {canCancelRefund && isPaid && !plan && order.status !== "CANCELLED" && (
        <div id={CANCEL_REFUND_ANCHOR} className="scroll-mt-24">
          <CancelRefundForm kind="order" id={order.id} defaultAmountInPaise={order.totalInPaise} onCancelled={refresh} />
        </div>
      )}

      <RefundHistoryCard
        cancelledAt={order.cancelledAt}
        cancellationReason={order.cancellationReason}
        refunds={order.refunds}
      />

      {canMove && order.status !== "CANCELLED" && (
        <div className="card flex justify-center p-6">
          <OrderStatusStepper
            // Cash on delivery sits at PENDING_PAYMENT until the kitchen
            // starts it — on the stepper that's simply "Confirmed".
            status={(order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status) as OrderStatus}
            fulfillmentType={order.fulfillmentType}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Items</h3>
          <div className="flex flex-col gap-2">
            {order.items.map((item) => {
              const addonUnitTotal = (item.addons ?? []).reduce(
                (sum, a) => sum + a.priceInPaiseSnapshot * a.quantity,
                0,
              );
              return (
                <Fragment key={item.id}>
                  <div className="flex justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="min-w-0 wrap-break-word">
                      {item.nameSnapshot} × {item.quantity}
                    </span>
                    {!plan && (
                      <span className="shrink-0">
                        {formatPriceFromPaise((item.priceInPaiseSnapshot + addonUnitTotal) * item.quantity)}
                      </span>
                    )}
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <ul className="-mt-1 flex flex-col gap-0.5 pl-3 text-xs text-zinc-400">
                      {item.addons.map((a) => (
                        <li key={a.id} className="wrap-break-word">
                          + {a.nameSnapshot} × {a.quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                </Fragment>
              );
            })}
          </div>
          {plan ? (
            <p className="mt-2 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Included in the customer&apos;s {plan.planName} plan — no separate payment.
            </p>
          ) : (
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
          )}
          {order.prepNotes && (
            <div className="mt-2 wrap-break-word rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <span className="font-medium">Cooking instructions: </span>
              {order.prepNotes}
            </div>
          )}
          {deliveryNote && (
            <div className="mt-2 wrap-break-word rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Delivery notes: </span>
              {deliveryNote}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="card flex flex-col gap-2 p-6">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <User className="h-4 w-4" />
              Customer
            </h3>
            {order.user ? (
              <>
                {canViewCustomers ? (
                  <Link
                    href={`/admin/customers/${order.userId}`}
                    className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {order.user.firstName} {order.user.lastName ?? ""}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {order.user.firstName} {order.user.lastName ?? ""}
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.user.email}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {order.guestName?.trim() || "Walk-in guest"}
                </p>
                {order.guestPhone && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.guestPhone}</p>
                )}
              </>
            )}
          </div>

          {isDineInLike ? (
            <div className="card flex flex-col gap-2 p-6 text-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {order.fulfillmentType === "DINE_IN" ? "Dine-in" : "Takeaway"}
              </h3>
              {order.dineInKitchenZone && (
                <p className="text-zinc-600 dark:text-zinc-400">{order.dineInKitchenZone.name}</p>
              )}
              {order.fulfillmentType === "DINE_IN" && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {order.tableLabelSnapshot ? `Table: ${order.tableLabelSnapshot}` : "No table assigned yet"}
                </p>
              )}
            </div>
          ) : (
            <div className="card flex flex-col gap-2 p-6 text-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {order.fulfillmentType === "PICKUP" ? "Pickup" : "Delivery"}
              </h3>
              {order.fulfillmentType === "PICKUP" ? (
                <div className="flex min-w-0 items-start gap-2 text-zinc-600 dark:text-zinc-400">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <div className="min-w-0">
                    <span className="wrap-break-word">
                      {order.pickupKitchenZone?.pickupAddress ?? "Pickup location unavailable"}
                    </span>
                    {order.pickupKitchenZone && (
                      <div className="mt-0.5">
                        <MapLink lat={order.pickupKitchenZone.lat} lng={order.pickupKitchenZone.lng} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-start gap-2 text-zinc-600 dark:text-zinc-400">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    <div className="min-w-0">
                      <span className="wrap-break-word">
                        {order.address!.line1}
                        {order.address!.line2 ? `, ${order.address!.line2}` : ""}, {order.address!.city},{" "}
                        {order.address!.state} — {order.address!.pincode}
                      </span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                        <MapLink lat={order.address!.lat} lng={order.address!.lng} />
                        <ShareAddressButton address={order.address!} className="text-xs" />
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Phone className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="wrap-break-word">{order.address!.contactPhone}</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Clock className="h-4 w-4 shrink-0 text-primary-600" />
                <span>
                  {order.isInstant
                    ? "Instant delivery"
                    : `${order.deliverySlotName} (${formatTime12h(order.deliveryWindowStart)}–${formatTime12h(order.deliveryWindowEnd)})`}
                  {" · "}
                  {new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
            </div>
          )}

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

      {isDineInLike && canOrderCreate && hasFeature("dine-in") && (
        <DineInOrderPanel order={order} onChanged={refresh} />
      )}
    </div>
  );
}
