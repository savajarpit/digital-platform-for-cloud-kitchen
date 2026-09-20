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
  /** Reason the kitchen isn't taking orders right now, or null when it is. */
  windowClosed: string | null;
  /** null while loading. */
  pickupInfo: PickupInfo | null;
  /** null while loading. */
  instantStatus: InstantDeliveryStatus | null;
  /** null while loading. */
  slots: DeliverySlot[] | null;
  dayOptions: { value: string; label: string }[];
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
      return { value, label };
    });
  }, [config, today, tomorrow]);

  const status = windowQuery.data;
  return {
    windowClosed:
      status && !status.isAcceptingOrders ? (status.reason ?? "Not currently accepting orders") : null,
    pickupInfo: pickupQuery.data ?? (pickupQuery.isError ? NO_PICKUP : null),
    instantStatus: instantQuery.data ?? (instantQuery.isError ? NO_INSTANT : null),
    slots: config?.slots ?? (slotsQuery.isError ? NO_SLOTS : null),
    dayOptions,
    todayStr: config?.todayStr ?? "",
    nowMinutes: config?.nowMinutes ?? 0,
  };
}
