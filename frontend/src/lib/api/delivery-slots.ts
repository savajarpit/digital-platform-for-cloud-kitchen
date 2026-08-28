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
}

/** Public, client-side — drives the checkout page's day/slot pickers. */
export async function getDeliverySlots(): Promise<DeliverySlotsConfig> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/delivery-slots`, {
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
