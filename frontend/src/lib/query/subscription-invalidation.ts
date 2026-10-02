import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";

/** A subscription or plan changed (created, paused, skipped, cancelled,
 * refunded, plan edited/published...): the admin subscription screens (lists,
 * detail, analytics, today's deliveries), everything derived from them
 * (orders materialised from a subscription, overview tiles, a customer's
 * detail) and the storefront's own subscription/plan caches all refetch. */
export function invalidateSubscriptionAreas(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.admin("subscriptions") }),
    qc.invalidateQueries({ queryKey: qk.admin("orders") }),
    qc.invalidateQueries({ queryKey: qk.admin("overview") }),
    qc.invalidateQueries({ queryKey: qk.admin("customers") }),
    qc.invalidateQueries({ queryKey: qk.subscriptions.all }),
    qc.invalidateQueries({ queryKey: ["plans"] }),
    qc.invalidateQueries({ queryKey: qk.admin("cancellation-requests") }),
  ]);
}
