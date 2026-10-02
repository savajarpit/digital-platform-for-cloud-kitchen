"use client";

import { useQuery } from "@tanstack/react-query";
import { getPendingCancellationCount } from "@/lib/api/cancellation-requests";
import { qk } from "@/lib/query/keys";

/** Pending customer cancellation requests per kind — for tab/filter badges.
 * Refreshes on focus so a request that arrived while the tab sat idle shows
 * up without a reload. Zero while loading or on error. */
export function usePendingCancellationCount(): {
  subscriptions: number;
  orders: number;
} {
  const { data } = useQuery({
    queryKey: qk.admin("cancellation-requests", "pending-count"),
    queryFn: getPendingCancellationCount,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  return data ?? { subscriptions: 0, orders: 0 };
}
