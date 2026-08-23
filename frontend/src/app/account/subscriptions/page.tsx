"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { ApiError, listMySubscriptions, type SubscriptionSummary } from "@/lib/api/subscriptions";
import { Skeleton } from "@/components/ui/Skeleton";
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
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
        <div className="flex flex-col gap-3">
          {subscriptions.map((sub) => (
            <Link
              key={sub.id}
              href={`/account/subscriptions/${sub.id}`}
              className="card card-hover flex items-center justify-between gap-3 p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {sub.planNameSnapshot}
                  </span>
                  <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[sub.status]}`}>
                    {sub.status.replace("_", " ")}
                  </span>
                </div>
                {sub.cycleEnd && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Active through {new Date(sub.cycleEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
