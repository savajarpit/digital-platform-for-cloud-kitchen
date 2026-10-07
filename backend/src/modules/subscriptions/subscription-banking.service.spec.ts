import { SubscriptionBankingService } from './subscription-banking.service';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';

const mockRepo = {
  findPlanScheduleConfig: jest.fn(),
  findPlanDeliveryDayKeys: jest.fn(),
  findScheduledDates: jest.fn(),
  createScheduledDates: jest.fn(),
};
const mockSettingsRepo = {
  findClosedDates: jest.fn(),
  findBusinessProfile: jest.fn(),
};

const relativePlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
  weekCount: null,
  scheduleAnchorDate: null,
  durationDays: 7,
  offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
};

// Anchor Monday 2026-09-21; Mon–Sat deliver, Sunday is an off day.
const weeklyPlan = {
  schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
  weekCount: 1,
  scheduleAnchorDate: '2026-09-21',
  durationDays: 6,
  offDayHandling: SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE,
};
const MON_TO_SAT = new Set(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']);

function subscription(
  overrides: Partial<{ usesDateSelection: boolean; cycleEnd: string }> = {},
) {
  return {
    id: 'sub1',
    planId: 'p1',
    cycleEnd: new Date(`${overrides.cycleEnd ?? '2026-09-26'}T00:00:00.000Z`),
    usesDateSelection: overrides.usesDateSelection ?? false,
  };
}

describe('SubscriptionBankingService', () => {
  let service: SubscriptionBankingService;

  beforeEach(() => {
    service = new SubscriptionBankingService(
      mockRepo as never,
      mockSettingsRepo as never,
    );
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
  });

  afterEach(() => jest.resetAllMocks());

  it('falls back to flat calendar-day addition when the plan config is missing', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(null);

    const result = await service.bankExtraDays('t1', subscription(), 3);

    expect(result).toEqual(new Date('2026-09-29T00:00:00.000Z'));
    expect(mockSettingsRepo.findClosedDates).not.toHaveBeenCalled();
  });

  it('RELATIVE_DAY, no closures, not date-selection: flat addition, no DB writes', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);

    const result = await service.bankExtraDays('t1', subscription(), 2);

    expect(result).toEqual(new Date('2026-09-28T00:00:00.000Z'));
    expect(mockRepo.createScheduledDates).not.toHaveBeenCalled();
  });

  it('a pause running past cycleEnd resumes the credited days after the pause', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);

    // cycleEnd 26 Sep, pause until 30 Sep, 2 credited days -> 1 and 2 Oct.
    const result = await service.bankExtraDays(
      't1',
      subscription(),
      2,
      '2026-09-30',
    );

    expect(result).toEqual(new Date('2026-10-02T00:00:00.000Z'));
  });

  it('a pause ending before cycleEnd still banks from cycleEnd', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);

    const result = await service.bankExtraDays(
      't1',
      subscription(),
      2,
      '2026-09-24',
    );

    expect(result).toEqual(new Date('2026-09-28T00:00:00.000Z'));
  });

  it('date selection: a pause past cycleEnd appends dates after the pause', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);
    mockRepo.findScheduledDates.mockResolvedValue([
      { date: '2026-09-26', sequence: 7 },
    ]);

    await service.bankExtraDays(
      't1',
      subscription({ usesDateSelection: true }),
      2,
      '2026-09-30',
    );

    expect(mockRepo.createScheduledDates).toHaveBeenCalledWith('sub1', [
      { date: '2026-10-01', sequence: 8 },
      { date: '2026-10-02', sequence: 9 },
    ]);
  });

  it('WEEKLY_FIXED: skips the off-weekday even without date selection', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(weeklyPlan);
    mockRepo.findPlanDeliveryDayKeys.mockResolvedValue(MON_TO_SAT);

    // cycleEnd Sat 26 Sep, +1 real day -> Sunday is off -> Monday 28 Sep.
    const result = await service.bankExtraDays('t1', subscription(), 1);

    expect(result).toEqual(new Date('2026-09-28T00:00:00.000Z'));
  });

  it('skips a tenant closed date even for a RELATIVE_DAY plan', async () => {
    mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      {
        date: '2026-09-27',
        name: null,
        note: null,
        appliesTo: 'SUBSCRIPTIONS',
      },
    ]);

    const result = await service.bankExtraDays('t1', subscription(), 1);

    expect(result).toEqual(new Date('2026-09-28T00:00:00.000Z'));
  });

  describe('usesDateSelection', () => {
    it('appends one scheduled date at the next sequence and returns it as the new cycleEnd', async () => {
      mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);
      mockRepo.findScheduledDates.mockResolvedValue([
        { date: '2026-09-20', sequence: 1 },
        { date: '2026-09-26', sequence: 6 },
      ]);

      const result = await service.bankExtraDays(
        't1',
        subscription({ usesDateSelection: true }),
        1,
      );

      expect(mockRepo.createScheduledDates).toHaveBeenCalledWith('sub1', [
        { date: '2026-09-27', sequence: 7 },
      ]);
      expect(result).toEqual(new Date('2026-09-27T00:00:00.000Z'));
    });

    it('appends multiple dates in walked order, skipping off-days/closures for each step', async () => {
      mockRepo.findPlanScheduleConfig.mockResolvedValue(weeklyPlan);
      mockRepo.findPlanDeliveryDayKeys.mockResolvedValue(MON_TO_SAT);
      mockRepo.findScheduledDates.mockResolvedValue([
        { date: '2026-09-26', sequence: 6 },
      ]);

      // From Sat 26 Sep, 2 real days: (Sun off) Mon 28, Tue 29.
      const result = await service.bankExtraDays(
        't1',
        subscription({ usesDateSelection: true }),
        2,
      );

      expect(mockRepo.createScheduledDates).toHaveBeenCalledWith('sub1', [
        { date: '2026-09-28', sequence: 7 },
        { date: '2026-09-29', sequence: 8 },
      ]);
      expect(result).toEqual(new Date('2026-09-29T00:00:00.000Z'));
    });

    it('still applies even with zero prior scheduled-date rows (sequence starts at 1)', async () => {
      mockRepo.findPlanScheduleConfig.mockResolvedValue(relativePlan);
      mockRepo.findScheduledDates.mockResolvedValue([]);

      await service.bankExtraDays(
        't1',
        subscription({ usesDateSelection: true, cycleEnd: '2026-09-26' }),
        1,
      );

      expect(mockRepo.createScheduledDates).toHaveBeenCalledWith('sub1', [
        { date: '2026-09-27', sequence: 1 },
      ]);
    });
  });
});
