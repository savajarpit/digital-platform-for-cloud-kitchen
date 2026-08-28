import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { DateUtil } from './date.util';

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
}
