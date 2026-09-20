"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { ApiError, listMySubscriptions } from "@/lib/api/subscriptions";
import { qk, STALE } from "@/lib/query/keys";
import { SubscriptionCardSkeleton } from "@/components/subscriptions/SubscriptionCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/format/status-styles";
import { PageHeader } from "@/components/account/PageHeader";

export default function MySubscriptionsPage() {
  const router = useRouter();
  // Cached: revisiting shows the last list instantly and refreshes quietly
  // once it is older than STALE.list.
  const {
    data: subscriptions,
    isPending,
    error,
  } = useQuery({
    queryKey: qk.subscriptions.list,
    queryFn: listMySubscriptions,
    staleTime: STALE.list,
  });
  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.push("/login?redirect=/account/subscriptions");
  }, [unauthorized, router]);

  function renderBody() {
    if (!subscriptions) {
      if (isPending || unauthorized) {
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SubscriptionCardSkeleton key={i} />
            ))}
          </div>
        );
      }
      return (
        <EmptyState
          icon={CalendarClock}
          title="Couldn't load your subscriptions"
          description="Please try again in a moment."
        />
      );
    }

    if (subscriptions.length === 0) {
      return (
        <EmptyState
          icon={CalendarClock}
          title="You don't have any meal plan subscriptions yet."
          action={
            <Link href="/plans" className="btn-primary">
              Browse plans
            </Link>
          }
        />
      );
    }

    return (
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
    );
  }

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader icon={CalendarClock} title="My Subscriptions" />
      {renderBody()}
    </main>
  );
}
