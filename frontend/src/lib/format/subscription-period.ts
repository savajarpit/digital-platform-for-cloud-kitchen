import type { SubscriptionSummary } from "@/lib/api/subscriptions";
import { formatDate } from "./date";

/** "Active through 9 Oct 2026" while active, "Ended 9 Oct 2026" once
 * expired. Null for a cancelled (deliveries stopped early) or unpaid plan,
 * where the cycle end would read as a promise that no longer holds. */
export function subscriptionPeriodLabel(
  status: SubscriptionSummary["status"],
  cycleEnd: string | null,
): string | null {
  if (!cycleEnd) return null;
  if (status === "ACTIVE") return `Active through ${formatDate(cycleEnd)}`;
  if (status === "EXPIRED") return `Ended ${formatDate(cycleEnd)}`;
  return null;
}
