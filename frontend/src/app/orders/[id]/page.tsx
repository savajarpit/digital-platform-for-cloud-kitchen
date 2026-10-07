"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, CheckCircle2, ChevronLeft, Clock, FileText, MapPin, Package, Phone } from "lucide-react";
import { ApiError, getOrder } from "@/lib/api/orders";
import { qk, STALE } from "@/lib/query/keys";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

/** "Sat, 3 Oct" — deliveryDate is UTC midnight of the delivery day. */
function formatDeliveryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
import { ORDER_STATUS_STYLES } from "@/lib/format/status-styles";
import { orderStatusLabel } from "@/lib/format/order-status";
import { OrderStatusStepper, type OrderStatus } from "@/components/ui/OrderStatusStepper";
import { OrderCancellationSection } from "@/components/orders/OrderCancellationSection";
import { OrderDetailSkeleton } from "@/components/orders/OrderDetailSkeleton";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("order");
  const tInvoice = useTranslations("invoice");
  const router = useRouter();
  // Order status changes while a customer watches, so this is fresh for only
  // a short window; the cached copy still shows instantly on revisit.
  const {
    data: order,
    error,
    isError,
  } = useQuery({
    queryKey: qk.orders.detail(id),
    queryFn: () => getOrder(id),
    staleTime: STALE.short,
  });
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.push(`/login?redirect=/orders/${id}`);
  }, [unauthorized, id, router]);

  const notFound = isError && !unauthorized;

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
    return <OrderDetailSkeleton />;
  }

  const isPaid = order.paymentStatus === "PAID";
  // An order staff took by phone, paid in cash/UPI when it arrives.
  const payOnDelivery = !isPaid && order.paymentMethod !== "RAZORPAY" && order.status !== "CANCELLED";
  // A plan delivery was paid for with the plan: no price, total or invoice of
  // its own, and the label the kitchen sees isn't a note from the customer.
  const plan = order.planDelivery;
  const customerNote = plan ? plan.customerNote : order.notes;
  const anyTime = order.deliveryWindowStart === "00:00" && order.deliveryWindowEnd === "23:59";

  return (
    <main className="container-app flex-1 py-16">
      <Link
        href="/orders"
        className="mx-auto mb-4 flex max-w-xl items-center gap-1 text-sm text-zinc-500 hover:text-primary-600 dark:text-zinc-400"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("viewOrders")}
      </Link>

      <div className="card mx-auto max-w-xl p-8 text-center">
        {plan ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary-600" />
            <h1 className="font-display mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Your plan delivery
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {plan.planName}
              {plan.dayLabel && ` · ${plan.dayLabel}`} — included in your plan.
            </p>
          </>
        ) : isPaid || payOnDelivery ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary-600" />
            <h1 className="font-display mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("confirmedTitle")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {payOnDelivery ? t("payOnDeliverySubtitle") : t("confirmedSubtitle")}
            </p>
          </>
        ) : (
          <>
            <Package className="mx-auto h-12 w-12 text-zinc-400" />
            <h1 className="font-display mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {orderStatusLabel(order.status, order.fulfillmentType)}
            </h1>
          </>
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className={`badge ${ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.CONFIRMED}`}>
            {orderStatusLabel(order.status, order.fulfillmentType)}
          </span>
        </div>

        {(isPaid || payOnDelivery) && (
          <div className="mt-6 flex justify-center">
            <OrderStatusStepper
              status={(order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status) as OrderStatus}
              fulfillmentType={order.fulfillmentType}
            />
          </div>
        )}

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {t("orderNumber")}: <span className="font-mono">{order.orderNumber}</span>
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800">
          {order.fulfillmentType === "PICKUP" ? (
            <div className="flex min-w-0 items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <span className="min-w-0 wrap-break-word">
                Pickup: {order.pickupKitchenZone?.pickupAddress ?? "—"}
              </span>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-start gap-2 text-zinc-600 dark:text-zinc-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span className="min-w-0 wrap-break-word">
                  {order.address!.line1}
                  {order.address!.line2 ? `, ${order.address!.line2}` : ""}, {order.address!.city},{" "}
                  {order.address!.state} — {order.address!.pincode}
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Phone className="h-4 w-4 shrink-0 text-primary-600" />
                <span className="min-w-0 wrap-break-word">{order.address!.contactPhone}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Clock className="h-4 w-4 shrink-0 text-primary-600" />
            <span>
              {anyTime
                ? "Any time"
                : `${order.deliverySlotName} (${formatTime12h(order.deliveryWindowStart)}–${formatTime12h(order.deliveryWindowEnd)})`}{" "}
              · {formatDeliveryDate(order.deliveryDate)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800">
          <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{t("items")}</h2>
          {order.items.map((item) => {
            const addonUnitTotal = (item.addons ?? []).reduce(
              (sum, a) => sum + a.priceInPaiseSnapshot * a.quantity,
              0,
            );
            return (
              <div key={item.id} className="flex flex-col gap-0.5">
                <div className="flex justify-between gap-3 text-zinc-600 dark:text-zinc-400">
                  <span className="min-w-0 wrap-break-word">
                    {item.nameSnapshot} × {item.quantity}
                    {item.isFreeItem && (
                      <span className="ml-2 text-xs font-semibold text-primary-600 dark:text-primary-400">
                        FREE
                      </span>
                    )}
                  </span>
                  {!plan && (
                    <span className="shrink-0">
                      {formatPriceFromPaise((item.priceInPaiseSnapshot + addonUnitTotal) * item.quantity)}
                    </span>
                  )}
                </div>
                {item.addons && item.addons.length > 0 && (
                  <ul className="flex flex-col gap-0.5 pl-3 text-xs text-zinc-400">
                    {item.addons.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2">
                        <span>
                          + {a.nameSnapshot} × {a.quantity}
                        </span>
                        <span>{formatPriceFromPaise(a.priceInPaiseSnapshot * a.quantity * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {order.discountInPaise > 0 && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatPriceFromPaise(order.discountInPaise)}</span>
            </div>
          )}
          {order.deliveryFeeInPaise > 0 && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Delivery fee</span>
              <span>{formatPriceFromPaise(order.deliveryFeeInPaise)}</span>
            </div>
          )}
          {plan ? (
            <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Included in your plan — nothing extra to pay.
            </p>
          ) : (
            <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              <span>Total</span>
              <span>{formatPriceFromPaise(order.totalInPaise)}</span>
            </div>
          )}
        </div>

        {(order.prepNotes || customerNote) && (
          <div className="mt-4 flex flex-col gap-2 text-left text-sm">
            {order.prepNotes && (
              <div className="rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <span className="font-medium">Cooking instructions: </span>
                {order.prepNotes}
              </div>
            )}
            {customerNote && (
              <div className="rounded-xl bg-zinc-50 p-3 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Delivery notes: </span>
                {customerNote}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders" className="btn-outline">
            {t("viewOrders")}
          </Link>
          {plan ? (
            <Link href={`/account/subscriptions/${plan.subscriptionId}`} className="btn-outline">
              <CalendarClock className="h-4 w-4" />
              View my plan
            </Link>
          ) : (
            <Link href={`/orders/${order.id}/invoice`} className="btn-outline">
              <FileText className="h-4 w-4" />
              {tInvoice("downloadInvoice")}
            </Link>
          )}
          <Link href="/menu" className="btn-primary">
            {t("backToMenu")}
          </Link>
        </div>
      </div>
      <OrderCancellationSection orderId={order.id} />
    </main>
  );
}
