import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';
import { PlanScheduleUtil } from './plan-schedule.util';
import type { ClosedDateEntry } from './closed-dates.util';
import type { HolidayProjection } from './subscription-holiday-projection.util';

/** How many calendar days ahead the account page lists (contiguous plans),
 * or how many scheduled dates it lists (date-selection plans). */
export const PREVIEW_DAYS_AHEAD = 14;

export interface UpcomingPreviewDay {
  date: string;
  skipped: boolean;
  meals: {
    slotType: string;
    mealId: string | null;
    name: string | null;
    imageUrl: string | null;
  }[];
  addressId: string;
  deliverySlotId: string | null;
  isOverridden: boolean;
  /** This day's prep/customization note, if the customer set one — surfaced
   * here so the account page can pre-fill it when the day card reopens. */
  note: string | null;
  /** Too close to delivery to skip/pause/override — the notice window has
   * already passed. The frontend should hide those controls and explain
   * why instead of letting the customer submit and hit a rejection. */
  locked: boolean;
  /** Set only when the business, not the customer, took this day away — a
   * declared disruption or a holiday — shown instead of the plain
   * "Skipped" label so the customer understands why. */
  disruptionReason: string | null;
  /** Upcoming holiday only — the day it will add at the end of the plan. */
  replacementDate: string | null;
  /** The kitchen's holiday (not a declared disruption or the customer's own skip). */
  isHoliday: boolean;
  /** No delivery while the customer's cancellation request is pending (or
   * a day already held for one). Always `skipped` and `locked` too. */
  onHold: boolean;
}

interface UpcomingSubscription {
  nextPlanDayNumber: number;
  startDate: Date | null;
  cycleEnd: Date | null;
  addressId: string;
  deliverySlotId: string | null;
  usesDateSelection: boolean;
  scheduledDates: { date: string; sequence: number }[];
  skips: {
    dateFrom: string;
    dateTo: string;
    reason: string | null;
    disruptionId?: string | null;
    cancellationRequestId?: string | null;
  }[];
  dayOverrides: {
    date: string;
    addressId: string | null;
    deliverySlotId: string | null;
    note: string | null;
  }[];
  plan: {
    schedulingMode: SubscriptionPlanSchedulingMode;
    durationDays: number;
    weekCount: number | null;
    scheduleAnchorDate: string | null;
    days: {
      dayNumber: number | null;
      weekNumber: number | null;
      weekday: number | null;
      slots: {
        slotType: string;
        meal: { id: string; name: string; imageUrl: string | null } | null;
      }[];
    }[];
  };
}

/** The account page's upcoming deliveries, mirroring what the nightly
 * materializer will actually do:
 * - a date-selection subscriber gets only their own scheduled dates, the
 *   plan day advancing only on a delivered date (a skip shifts later menus);
 * - a contiguous subscriber walks the next PREVIEW_DAYS_AHEAD calendar days
 *   (capped at cycleEnd), where a skipped day consumes no template day and
 *   the template loops once exhausted;
 * - a WEEKLY_FIXED off-day (no slots) is not a delivery, so it isn't listed;
 * - a subscription-affecting holiday is listed as skipped, with its name.
 * Each day resolves its effective address/slot — a SubscriptionDayOverride
 * for that date, else the subscription's own default.
 *
 * `closedDates` must already be filtered to the ones affecting subscriptions. */
export function buildUpcomingPreview(
  subscription: UpcomingSubscription,
  todayStr: string,
  timezone: string,
  earliestEditableDateStr: string,
  closedDates: ClosedDateEntry[],
  projection?: HolidayProjection,
  /** A pending cancellation request's heldFromDate — see the calendar util. */
  holdFromDateStr?: string | null,
): UpcomingPreviewDay[] {
  if (!subscription.cycleEnd || !subscription.startDate) return [];
  const cycleEndStr = DateUtil.toTenantDateStr(subscription.cycleEnd, timezone);
  const startDateStr = DateUtil.toTenantDateStr(
    subscription.startDate,
    timezone,
  );
  // Never before Day 1 actually begins — matches the scheduler's own guard.
  const fromStr = todayStr > startDateStr ? todayStr : startDateStr;

  const { plan } = subscription;
  const weekly =
    plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
  const daysByNumber = new Map(plan.days.map((d) => [d.dayNumber, d]));
  const daysByWeekWeekday = new Map(
    plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
  );
  const overridesByDate = new Map(
    subscription.dayOverrides.map((o) => [o.date, o]),
  );
  const closedByDate = new Map(closedDates.map((c) => [c.date, c]));

  const isOffDay = (dateStr: string): boolean => {
    if (!weekly) return false;
    const key = PlanScheduleUtil.resolveKey(plan, {
      dateStr,
      relativeCounter: 1,
    });
    const day =
      'weekNumber' in key
        ? daysByWeekWeekday.get(`${key.weekNumber}-${key.weekday}`)
        : undefined;
    return !day || day.slots.length === 0;
  };

  const entry = (
    dateStr: string,
    relativeCounter: number,
  ): { day: UpcomingPreviewDay; delivered: boolean } => {
    const override = overridesByDate.get(dateStr);
    const base = {
      date: dateStr,
      addressId: override?.addressId ?? subscription.addressId,
      deliverySlotId:
        override?.deliverySlotId ?? subscription.deliverySlotId ?? null,
      isOverridden: Boolean(override),
      note: override?.note ?? null,
      locked: dateStr < earliestEditableDateStr,
    };
    const skip = subscription.skips.find(
      (s) => s.dateFrom <= dateStr && dateStr <= s.dateTo,
    );
    const closure = closedByDate.get(dateStr);
    const onHold =
      Boolean(skip?.cancellationRequestId) ||
      (!skip && !closure && !!holdFromDateStr && dateStr >= holdFromDateStr);
    if (onHold) {
      return {
        day: {
          ...base,
          locked: true,
          skipped: true,
          meals: [],
          disruptionReason: null,
          replacementDate: null,
          isHoliday: false,
          onHold: true,
        },
        delivered: false,
      };
    }
    if (skip || closure) {
      return {
        day: {
          ...base,
          skipped: true,
          meals: [],
          // A customer's own skip/pause keeps its (null) reason — only a
          // business-side closure gets a label.
          disruptionReason: skip
            ? skip.reason
            : closure?.name
              ? `Holiday — ${closure.name}`
              : 'Holiday',
          replacementDate: skip
            ? null
            : (projection?.replacementByHoliday.get(dateStr) ?? null),
          // Same rule as the calendar: a materialized closure is a skip with
          // a reason but no disruption; a future one is the closure itself.
          isHoliday: skip ? Boolean(skip.reason) && !skip.disruptionId : true,
          onHold: false,
        },
        delivered: false,
      };
    }
    const key = PlanScheduleUtil.resolveKey(plan, {
      dateStr,
      relativeCounter,
    });
    const planDay =
      'dayNumber' in key
        ? daysByNumber.get(key.dayNumber)
        : daysByWeekWeekday.get(`${key.weekNumber}-${key.weekday}`);
    return {
      day: {
        ...base,
        skipped: false,
        meals: (planDay?.slots ?? []).map((slot) => ({
          slotType: slot.slotType,
          mealId: slot.meal?.id ?? null,
          name: slot.meal?.name ?? null,
          imageUrl: slot.meal?.imageUrl ?? null,
        })),
        disruptionReason: null,
        replacementDate: null,
        isHoliday: false,
        onHold: false,
      },
      delivered: true,
    };
  };

  if (subscription.usesDateSelection) {
    // Same running counter the materializer advances on each delivered
    // scheduled date, so a skipped date shifts later menus (RELATIVE_DAY).
    let selectionCounter = subscription.nextPlanDayNumber;
    const preview: UpcomingPreviewDay[] = [];
    const upcomingDates = subscription.scheduledDates
      .map((s) => s.date)
      .filter((d) => d >= fromStr && d <= cycleEndStr)
      .sort();
    for (const date of upcomingDates.slice(0, PREVIEW_DAYS_AHEAD)) {
      const { day, delivered } = entry(date, selectionCounter);
      preview.push(day);
      if (delivered) selectionCounter += 1;
    }
    return preview;
  }

  const preview: UpcomingPreviewDay[] = [];
  let cursor = fromStr;
  let counter = subscription.nextPlanDayNumber;
  for (let i = 0; i < PREVIEW_DAYS_AHEAD && cursor <= cycleEndStr; i++) {
    if (!isOffDay(cursor)) {
      const { day, delivered } = entry(cursor, counter);
      preview.push(day);
      if (delivered) counter += 1;
    }
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return preview;
}
