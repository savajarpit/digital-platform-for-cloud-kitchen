"use client";

import { useState } from "react";
import type { SubscriptionDetail } from "@/lib/api/subscriptions";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SubscriptionCalendar } from "./SubscriptionCalendar";
import { SubscriptionDayDetailsPanel } from "./SubscriptionDayDetailsPanel";

/** Month calendar plus the selected date's details, for the My Subscription
 * page — a side panel on wide screens, a bottom sheet on phones. */
export function SubscriptionCalendarSection({
  subscription,
  busy,
  onSkip,
  onSaveOverride,
  onOpenMove,
}: {
  subscription: SubscriptionDetail;
  busy: boolean;
  onSkip: (date: string) => void;
  onSaveOverride: (
    date: string,
    addressId: string,
    deliverySlotId: string,
    note: string,
  ) => void;
  onOpenMove: (date: string) => void;
}) {
  const { calendar } = subscription;
  const defaultDate =
    calendar.find((d) => d.kind === "UPCOMING")?.date ??
    calendar[0]?.date ??
    null;
  const [focusedDate, setFocusedDate] = useState<string | null>(defaultDate);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useMediaQuery("(max-width: 767px)");

  const focusedDay = calendar.find((d) => d.date === focusedDate) ?? null;

  function handleSelect(date: string) {
    setFocusedDate(date);
    if (isPhone) setSheetOpen(true);
  }

  if (calendar.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Nothing scheduled yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <SubscriptionCalendar
        days={calendar}
        focusedDate={focusedDate}
        onSelect={handleSelect}
      />

      <aside className="card hidden h-fit p-5 md:block xl:sticky xl:top-24">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Day details
        </p>
        <SubscriptionDayDetailsPanel
          key={focusedDay?.date ?? "empty"}
          day={focusedDay}
          subscription={subscription}
          busy={busy}
          onSkip={onSkip}
          onSaveOverride={onSaveOverride}
          onOpenMove={onOpenMove}
        />
      </aside>

      <BottomSheet
        open={sheetOpen && isPhone}
        onClose={() => setSheetOpen(false)}
        title="Day details"
      >
        <SubscriptionDayDetailsPanel
          key={focusedDay?.date ?? "empty"}
          day={focusedDay}
          subscription={subscription}
          busy={busy}
          onSkip={onSkip}
          onSaveOverride={onSaveOverride}
          onOpenMove={onOpenMove}
        />
      </BottomSheet>
    </div>
  );
}
