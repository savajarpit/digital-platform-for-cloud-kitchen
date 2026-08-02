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
