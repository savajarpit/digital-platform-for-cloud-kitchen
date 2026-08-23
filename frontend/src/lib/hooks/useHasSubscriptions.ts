"use client";

import { useEffect, useState } from "react";
import { listMySubscriptions } from "@/lib/api/subscriptions";

/** Whether the signed-in customer has ever bought a plan — drives whether
 * "My Subscriptions" shows up in nav at all. Independent of the tenant's
 * subscriptions-enabled toggle: an existing subscriber keeps access to
 * manage what they already have even if the tenant later hides /plans. */
export function useHasSubscriptions(enabled: boolean): boolean {
  const [hasSubscriptions, setHasSubscriptions] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    listMySubscriptions()
      .then((subs) => setHasSubscriptions(subs.length > 0))
      .catch(() => setHasSubscriptions(false));
  }, [enabled]);

  return hasSubscriptions;
}
