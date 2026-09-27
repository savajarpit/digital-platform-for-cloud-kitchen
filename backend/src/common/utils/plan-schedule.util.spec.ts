import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlanSchedulingMode } from '../../generated/prisma';
import { PlanScheduleUtil } from './plan-schedule.util';

const relativePlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
  weekCount: null,
  scheduleAnchorDate: null,
  durationDays: 7,
};

// Week 1 starts Monday 2026-09-21; delivery Mon–Sat, Sunday is an off day.
const weeklyPlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
  weekCount: 1,
  scheduleAnchorDate: '2026-09-21',
  durationDays: 6,
};
const MON_TO_SAT = new Set(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']);

describe('PlanScheduleUtil.advanceRealDeliveryDays', () => {
  describe('RELATIVE_DAY', () => {
    it('keeps the flat calendar math when there are no closed dates', () => {
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-21',
          7,
          true,
        ),
      ).toBe('2026-09-27');
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-22',
          1,
          false,
        ),
      ).toBe('2026-09-23');
    });

    it('treats an empty closed set like no closed dates', () => {
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-22',
          2,
          false,
          new Set(),
        ),
      ).toBe('2026-09-24');
    });

    it('skips a closed date when counting forward', () => {
      const closed = new Set(['2026-09-23']);
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-22',
          1,
          false,
          closed,
        ),
      ).toBe('2026-09-24');
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-22',
          2,
          false,
          closed,
        ),
      ).toBe('2026-09-25');
    });

    it('skips consecutive closed dates', () => {
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-22',
          1,
          false,
          new Set(['2026-09-23', '2026-09-24']),
        ),
      ).toBe('2026-09-25');
    });

    it('an inclusive start that is itself closed does not count', () => {
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          relativePlan,
          null,
          '2026-09-23',
          1,
          true,
          new Set(['2026-09-23']),
        ),
      ).toBe('2026-09-24');
    });
  });

  describe('WEEKLY_FIXED', () => {
    it('skips the off-weekday without any closed dates', () => {
      // Saturday 26 Sep → Sunday is off → Monday 28 Sep
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          weeklyPlan,
          MON_TO_SAT,
          '2026-09-26',
          1,
          false,
        ),
      ).toBe('2026-09-28');
    });

    it('also skips a closed date that would otherwise be a delivery day', () => {
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          weeklyPlan,
          MON_TO_SAT,
          '2026-09-26',
          1,
          false,
          new Set(['2026-09-28']),
        ),
      ).toBe('2026-09-29');
    });

    it('counts several real days across an off day and a closure', () => {
      // from Fri 25 Sep exclusive, 3 real days: Sat 26, (Sun off), (Mon 28 closed), Tue 29, Wed 30
      expect(
        PlanScheduleUtil.advanceRealDeliveryDays(
          weeklyPlan,
          MON_TO_SAT,
          '2026-09-25',
          3,
          false,
          new Set(['2026-09-28']),
        ),
      ).toBe('2026-09-30');
    });

    it('throws when the plan has no delivery days at all', () => {
      expect(() =>
        PlanScheduleUtil.advanceRealDeliveryDays(
          weeklyPlan,
          new Set(),
          '2026-09-26',
          1,
          false,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
