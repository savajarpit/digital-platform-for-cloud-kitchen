"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getMyUsage, type UsageStat, type UsageSummary } from "@/lib/api/tenant-limits";

function describe(label: string, stat: UsageStat): string | null {
  if (stat.hitLimit) {
    return stat.blockedAttempts > 0
      ? `${stat.blockedAttempts} customer${stat.blockedAttempts === 1 ? "" : "s"} tried to ${label} but your plan limit is hit — upgrade to serve them.`
      : `Your plan's ${label} limit is hit (${stat.used}/${stat.max}) — upgrade to keep going.`;
  }
  if (stat.nearLimit) {
    return `You're nearing your plan's ${label} limit (${stat.used}/${stat.max}) — consider upgrading.`;
  }
  return null;
}

export function UsageLimitBanner() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    getMyUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  if (!usage) return null;

  const messages = [
    describe("place orders", usage.orders),
    describe("add subscribers", usage.subscribers),
  ].filter((m): m is string => m !== null);

  if (messages.length === 0) return null;

  const anyHit = usage.orders.hitLimit || usage.subscribers.hitLimit;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-sm ${
        anyHit
          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-1">
          {messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      </div>
      <Link
        href="/admin/settings/plan"
        className="ml-6 w-fit cursor-pointer text-xs font-semibold underline underline-offset-2"
      >
        View plans
      </Link>
    </div>
  );
}
