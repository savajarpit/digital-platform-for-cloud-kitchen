"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrderWindowStatus } from "@/lib/api/order-window";
import {
  getDeliverySlots,
  getInstantDeliveryStatus,
  getPickupInfo,
  type DeliverySlot,
  type InstantDeliveryStatus,
  type PickupInfo,
} from "@/lib/api/delivery-slots";
import { qk } from "@/lib/query/keys";

// Stable fallbacks used when a public lookup fails, so checkout degrades the
// same way it always did (no pickup, no instant delivery) without new
// objects on every render.
const NO_PICKUP: PickupInfo = { available: false, zones: [] };
const NO_INSTANT: InstantDeliveryStatus = { available: false, etaMinMinutes: 30, etaMaxMinutes: 45 };
const NO_SLOTS: DeliverySlot[] = [];

export interface CheckoutData {
  /** Why nothing at all can be ordered (store temporarily closed / no open day), or null. */
  windowClosed: string | null;
  /** Kitchen closed right now but later days are open — informational, not blocking. */
  closedNowNote: string | null;
  /** null while loading. */
  pickupInfo: PickupInfo | null;
  /** null while loading. */
  instantStatus: InstantDeliveryStatus | null;
  /** null while loading. */
  slots: DeliverySlot[] | null;
  /** `closedName` is set (possibly "") on a closed day — holiday, weekly off,
   * cutoff passed: listed but not pickable. */
  dayOptions: { value: string; label: string; closedName?: string }[];
  /** Tenant-local "today" (YYYY-MM-DD) and minutes since midnight. */
  todayStr: string;
  nowMinutes: number;
}

/**
 * Everything the checkout page reads from the public settings endpoints.
 *
 * These are GATE data - whether the kitchen is taking orders, instant
 * delivery, pickup, slots. A customer must never act on a stale answer (a
 * tenant can close the store or change slots while this page is open), so
 * unlike the rest of the app they are never served from cache as fresh:
 * they refetch on every mount and tab focus, and the open/closed status
 * polls while the page is open. Placing the order additionally re-checks
 * everything (see lib/checkout/preflight.ts), and the backend enforces it
 * again. This polling is the interim until realtime pushes replace it.
 */
const GATE_QUERY = {
  staleTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
} as const;
const GATE_POLL_MS = 30_000;

export function useCheckoutData(labels: { today: string; tomorrow: string }): CheckoutData {
  const windowQuery = useQuery({
    queryKey: qk.checkout.orderWindow,
    queryFn: getOrderWindowStatus,
    ...GATE_QUERY,
    refetchInterval: GATE_POLL_MS,
  });
  const pickupQuery = useQuery({
    queryKey: qk.checkout.pickup,
    queryFn: getPickupInfo,
    ...GATE_QUERY,
  });
  const instantQuery = useQuery({
    queryKey: qk.checkout.instant,
    queryFn: getInstantDeliveryStatus,
    ...GATE_QUERY,
    refetchInterval: GATE_POLL_MS,
  });
  const slotsQuery = useQuery({
    queryKey: qk.checkout.slots,
    queryFn: getDeliverySlots,
    ...GATE_QUERY,
  });

  const config = slotsQuery.data;
  const { today, tomorrow } = labels;

  // Anchored to the tenant's "today", not the browser's — see
  // DeliverySlotsConfig. UTC-parse the YYYY-MM-DD so day-stepping can't be
  // shifted by the local timezone.
  const dayOptions = useMemo(() => {
    if (!config) return [];
    const [ty, tm, td] = config.todayStr.split("-").map(Number);
    const closedByDate = new Map(config.days.filter((d) => !d.open).map((d) => [d.date, d.reason ?? ""]));
    return Array.from({ length: config.maxAdvanceOrderDays + 1 }, (_, i) => {
      const date = new Date(Date.UTC(ty, tm - 1, td + i));
      const value = date.toISOString().slice(0, 10);
      const label =
        i === 0
          ? today
          : i === 1
            ? tomorrow
            : date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });
      return { value, label, closedName: closedByDate.get(value) };
    });
  }, [config, today, tomorrow]);

  const status = windowQuery.data;
  // Only a temporarily closed store (or no open day at all) blocks checkout —
  // a kitchen that's merely closed right now still takes scheduled orders.
  const windowClosed = config?.storeClosedReason
    ? `We're not taking orders right now — ${config.storeClosedReason.replace(/\.$/, "")}.`
    : (config && config.days.every((d) => !d.open)
      ? "No delivery days are open right now — please check back later."
      : null);
  return {
    windowClosed,
    closedNowNote:
      !windowClosed && status && !status.isAcceptingOrders
        ? `${status.reason ?? "The kitchen is closed right now"} — you can still schedule a delivery for later.`
        : null,
    pickupInfo: pickupQuery.data ?? (pickupQuery.isError ? NO_PICKUP : null),
    instantStatus: instantQuery.data ?? (instantQuery.isError ? NO_INSTANT : null),
    slots: config?.slots ?? (slotsQuery.isError ? NO_SLOTS : null),
    dayOptions,
    todayStr: config?.todayStr ?? "",
    nowMinutes: config?.nowMinutes ?? 0,
  };
}
