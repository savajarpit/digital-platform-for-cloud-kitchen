import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';

/** Safety cap on the forward-walk in advanceRealDeliveryDays — ~10 years of
 * daily iterations, far past any realistic plan/banking scenario. Exists so
 * a plan with zero decided delivery days anywhere fails fast with a clear
 * error instead of hanging the request. */
const MAX_ADVANCE_ITERATIONS = 3660;

/** The result of resolving which SubscriptionPlanDay a subscriber's real
 * delivery date maps to — RELATIVE_DAY plans key by a single ordinal,
 * WEEKLY_FIXED plans key by (weekNumber, weekday). Callers branch on which
 * shape came back rather than PlanScheduleUtil doing any DB access itself. */
export type PlanScheduleKey =
  | { dayNumber: number }
  | { weekNumber: number; weekday: number };

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Pure calendar math shared by the materialization scheduler, the
 * upcoming-preview builder, and the prep planner — the single place the
 * RELATIVE_DAY modulo formula and the WEEKLY_FIXED week/weekday formula
 * live, so the two don't drift by being hand-duplicated per caller. */
export class PlanScheduleUtil {
  static resolveKey(
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode;
      durationDays: number;
      weekCount: number | null;
      scheduleAnchorDate: string | null;
    },
    ctx: { dateStr: string; relativeCounter: number },
  ): PlanScheduleKey {
    if (plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      const weekCount = plan.weekCount ?? 1;
      const anchorStr = plan.scheduleAnchorDate ?? ctx.dateStr;
      const elapsedDays = DateUtil.diffInDays(anchorStr, ctx.dateStr);
      const weekIndex = Math.floor(elapsedDays / 7);
      const weekNumber =
        (((weekIndex % weekCount) + weekCount) % weekCount) + 1;
      const weekday = DateUtil.getDayOfWeekForDateStr(ctx.dateStr);
      return { weekNumber, weekday };
    }

    const dayNumber = ((ctx.relativeCounter - 1) % plan.durationDays) + 1;
    return { dayNumber };
  }

  static describeKey(key: PlanScheduleKey): string {
    return 'dayNumber' in key
      ? `Day ${key.dayNumber}`
      : `Week ${key.weekNumber} · ${WEEKDAY_SHORT[key.weekday]}`;
  }

  /** Advances `count` REAL delivery days from `fromDateStr`, skipping any
   * WEEKLY_FIXED "off day" (a resolved {weekNumber,weekday} not present in
   * `deliveryDayKeys`) along the way. Returns the landing date string.
   * Shared by: off-day-aware skip/pause banking (always applied, regardless
   * of a plan's offDayHandling), a plan's EXTEND_TO_COMPENSATE cycleEnd
   * computation at activation, and the tenant disruption tool's
   * compensation-day math — so the three never drift out of sync.
   *
   * RELATIVE_DAY has no off-day concept (it never binds to real weekdays),
   * so it's just the existing flat calendar-day math, unchanged.
   *
   * `inclusiveOfFromDate`: true when `fromDateStr` itself is the first
   * candidate to count (a fresh activation's startDate can itself be a real
   * delivery day and should count as day 1); false when `fromDateStr` is an
   * already-counted anchor to advance PAST (an existing cycleEnd already
   * represents a counted day, so banking starts counting from the day
   * after it). */
  static advanceRealDeliveryDays(
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode;
      weekCount: number | null;
      scheduleAnchorDate: string | null;
      durationDays: number;
    },
    deliveryDayKeys: Set<string> | null,
    fromDateStr: string,
    count: number,
    inclusiveOfFromDate: boolean,
  ): string {
    if (plan.schedulingMode !== SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      return DateUtil.addDaysToDateStr(
        fromDateStr,
        inclusiveOfFromDate ? count - 1 : count,
      );
    }
    if (!deliveryDayKeys || deliveryDayKeys.size === 0) {
      throw new BadRequestException(
        'This plan has no days with any decided meals — cannot compute a delivery schedule.',
      );
    }

    let cursor = fromDateStr;
    let counted = 0;
    let landed: string | null = null;
    for (let i = 0; i < MAX_ADVANCE_ITERATIONS; i++) {
      if (!(i === 0 && inclusiveOfFromDate)) {
        cursor = DateUtil.addDaysToDateStr(cursor, 1);
      }
      const key = PlanScheduleUtil.resolveKey(plan, {
        dateStr: cursor,
        relativeCounter: 1, // unused for WEEKLY_FIXED
      });
      if (
        'weekNumber' in key &&
        deliveryDayKeys.has(`${key.weekNumber}-${key.weekday}`)
      ) {
        counted++;
        if (counted === count) {
          landed = cursor;
          break;
        }
      }
    }
    if (!landed) {
      throw new BadRequestException(
        'Could not resolve a delivery schedule within a reasonable time span — check the plan has enough decided delivery days.',
      );
    }
    return landed;
  }
}
