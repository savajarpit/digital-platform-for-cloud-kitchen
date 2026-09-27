import type { SubscriptionDetail } from "@/lib/api/subscriptions";
import { SubscriptionDayCard } from "./SubscriptionDayCard";

/** The accordion (list) view of a subscription's upcoming days — the
 * original My Subscription presentation, kept as-is for tenants who stay
 * on ACCORDION, and as the "List" tab when a tenant offers BOTH. */
export function UpcomingDaysList({
  subscription,
  expandedDate,
  busy,
  onToggle,
  onSkip,
  onSaveOverride,
}: {
  subscription: SubscriptionDetail;
  expandedDate: string | null;
  busy: boolean;
  onToggle: (date: string) => void;
  onSkip: (date: string) => void;
  onSaveOverride: (
    date: string,
    addressId: string,
    deliverySlotId: string,
    note: string,
  ) => void;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Upcoming days
      </h2>
      <div className="flex flex-col gap-2">
        {subscription.upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing scheduled.
          </p>
        ) : (
          subscription.upcoming.map((day) => (
            <SubscriptionDayCard
              key={day.date}
              day={day}
              subscription={subscription}
              expanded={expandedDate === day.date}
              busy={busy}
              onToggle={() => onToggle(day.date)}
              onSkip={() => onSkip(day.date)}
              onSaveOverride={(addressId, slotId, note) =>
                onSaveOverride(day.date, addressId, slotId, note)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
