"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { ApiError, listMySubscriptions, type SubscriptionSummary } from "@/lib/api/subscriptions";
import { SubscriptionCardSkeleton } from "@/components/subscriptions/SubscriptionCardSkeleton";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";
import { PageHeader } from "@/components/account/PageHeader";

export default function MySubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[] | null>(null);

  useEffect(() => {
    listMySubscriptions()
      .then(setSubscriptions)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/account/subscriptions");
          return;
        }
        setSubscriptions([]);
      });
  }, [router]);

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={CalendarClock} title="My Subscriptions" />

      {!subscriptions ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You don&apos;t have any meal plan subscriptions yet.
          </p>
          <Link href="/plans" className="btn-primary">
            Browse plans
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subscriptions.map((sub) => (
            <Link
              key={sub.id}
              href={`/account/subscriptions/${sub.id}`}
              className="card card-hover flex items-center justify-between gap-3 p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {sub.planNameSnapshot}
                  </span>
                  <span className={`badge shrink-0 ${SUBSCRIPTION_STATUS_STYLES[sub.status]}`}>
                    {sub.status.replace("_", " ")}
                  </span>
                </div>
                {sub.cycleEnd && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Active through {new Date(sub.cycleEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
