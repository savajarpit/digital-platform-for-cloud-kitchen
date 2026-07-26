import { parseOrThrow } from "@/lib/api/client";
import { PUBLIC_API_URL } from "@/lib/config/env";

export interface OrderWindowStatus {
  isAcceptingOrders: boolean;
  reason?: string;
}

/** Public, client-side — drives the checkout page's disabled state. */
export async function getOrderWindowStatus(): Promise<OrderWindowStatus> {
  const res = await fetch(`${PUBLIC_API_URL}/settings/order-window/status`, {
    headers: { "X-Tenant-Domain": window.location.host },
  });
  return parseOrThrow<OrderWindowStatus>(res);
}
