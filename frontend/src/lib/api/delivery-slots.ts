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
