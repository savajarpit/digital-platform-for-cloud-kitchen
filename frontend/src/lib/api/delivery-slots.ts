import { parseOrThrow } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";

export interface DeliverySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface DeliverySlotsConfig {
  maxAdvanceOrderDays: number;
  slots: DeliverySlot[];
  /** "Today" (YYYY-MM-DD) and minutes-since-midnight in the tenant's
   * timezone — the checkout day/slot pickers must anchor to these, not the
   * browser clock, or a near-midnight order gets rejected server-side. */
  todayStr: string;
  nowMinutes: number;
  /** Each orderable day, and why it can't be scheduled when it can't (holiday, weekly off, cutoff passed). */
  days: { date: string; open: boolean; reason: string | null }[];
  /** Store temporarily closed — nothing can be ordered, today or later. */
  storeClosedReason: string | null;
}

/** Public, client-side — drives the checkout page's day/slot pickers. A
 * slot can be set to orders only, subscriptions only or both, so each flow
 * asks for its own list. */
export async function getDeliverySlots(): Promise<DeliverySlotsConfig> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/delivery-slots`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<DeliverySlotsConfig>(res);
}

/** Same, but the slots offered for subscriptions — the plan page and the
 * manual subscription form. */
export async function getSubscriptionDeliverySlots(): Promise<DeliverySlotsConfig> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/delivery-slots?for=subscriptions`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<DeliverySlotsConfig>(res);
}

export interface InstantDeliveryStatus {
  available: boolean;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  reason?: string;
}

/** Public, client-side — whether instant delivery is currently offered (enabled + kitchen open) + its ETA window. */
export async function getInstantDeliveryStatus(): Promise<InstantDeliveryStatus> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/instant-delivery/status`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<InstantDeliveryStatus>(res);
}

export interface PickupZone {
  id: string;
  pickupAddress: string;
  lat: number;
  lng: number;
}

export interface PickupInfo {
  available: boolean;
  zones: PickupZone[];
}

/** Public, client-side — whether pickup is currently offered (tenant master
 * switch + at least one eligible kitchen zone) and the list to choose from. */
export async function getPickupInfo(): Promise<PickupInfo> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/pickup`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<PickupInfo>(res);
}
