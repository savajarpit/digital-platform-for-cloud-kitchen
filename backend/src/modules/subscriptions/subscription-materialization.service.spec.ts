import { SubscriptionMaterializationService } from './subscription-materialization.service';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';

const mockRepo = {
  findSkipForDate: jest.fn(),
  findPendingCancellationHold: jest.fn(),
  findScheduledDate: jest.fn(),
  findDayOverride: jest.fn(),
  findDeliverySlotById: jest.fn(),
  findPlanDayWithSlots: jest.fn(),
  findPlanDayByWeekAndWeekday: jest.fn(),
  findPlanDeliveryDayKeys: jest.fn(),
  createSkip: jest.fn(),
  extendCycleEnd: jest.fn(),
  createMaterializedOrder: jest.fn(),
  advanceSubscriptionDay: jest.fn(),
  expireSubscription: jest.fn(),
  claimMaterializationDate: jest.fn(),
  releaseMaterializationDate: jest.fn(),
};
const mockSettingsRepo = { findClosedDates: jest.fn() };
const mockBanking = { bankExtraDays: jest.fn() };

// 08:30 IST on Tuesday 22 Sep 2026.
const TODAY = '2026-09-22';
const NOW = new Date('2026-09-22T03:00:00Z');

const closure = (
  date: string,
  appliesTo: 'ORDERS' | 'SUBSCRIPTIONS' | 'BOTH' = 'SUBSCRIPTIONS',
  name: string | null = 'Founder’s Day',
) => ({ date, name, note: null, appliesTo });

function subscription(
  overrides: {
    schedulingMode?: SubscriptionPlanSchedulingMode;
    offDayHandling?: SubscriptionOffDayHandling;
    cycleEnd?: string;
    usesDateSelection?: boolean;
    nextPlanDayNumber?: number;
  } = {},
) {
  return {
    id: 'sub1',
    tenantId: 't1',
    userId: 'u1',
    addressId: 'a1',
    deliverySlotId: null,
    planId: 'p1',
    planNameSnapshot: 'Weekly Plan',
    nextPlanDayNumber: overrides.nextPlanDayNumber ?? 3,
    usesDateSelection: overrides.usesDateSelection ?? false,
    startDate: new Date('2026-09-20T00:00:00.000Z'),
    cycleEnd: new Date(`${overrides.cycleEnd ?? '2026-09-30'}T00:00:00.000Z`),
    plan: {
      durationDays: 6,
      schedulingMode:
        overrides.schedulingMode ?? SubscriptionPlanSchedulingMode.RELATIVE_DAY,
      weekCount: 1,
      scheduleAnchorDate: '2026-09-21',
      offDayHandling:
        overrides.offDayHandling ?? SubscriptionOffDayHandling.LOSS_DELIVERY,
    },
    tenant: { businessProfile: { timezone: 'Asia/Kolkata' } },
  };
}

describe('SubscriptionMaterializationService — tenant closed dates', () => {
  let service: SubscriptionMaterializationService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    service = new SubscriptionMaterializationService(
      mockRepo as never,
      mockSettingsRepo as never,
      mockBanking as never,
    );
    mockRepo.claimMaterializationDate.mockResolvedValue(true);
    mockRepo.findSkipForDate.mockResolvedValue(null);
    mockRepo.findDayOverride.mockResolvedValue(null);
    mockRepo.findPlanDayWithSlots.mockResolvedValue({
      slots: [
        {
          mealId: 'm1',
          meal: { id: 'm1', name: 'Dal Tadka', priceInPaise: 15000 },
        },
      ],
    });
    mockBanking.bankExtraDays.mockResolvedValue(
      new Date('2026-10-01T00:00:00.000Z'),
    );
    // Every test's day is unclaimed unless it says otherwise.
    mockRepo.claimMaterializationDate.mockResolvedValue(true);
    // WEEKLY_FIXED plans deliver Mon–Sat of week 1 ("week-weekday" keys);
    // TODAY is a Tuesday, key "1-2".
    mockRepo.findPlanDeliveryDayKeys.mockResolvedValue(
      new Set(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("WEEKLY_FIXED: a closure on the plan's own off weekday is not compensated again", async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      closure(TODAY, 'SUBSCRIPTIONS', 'Weekly off'),
    ]);
    mockRepo.findPlanDeliveryDayKeys.mockResolvedValue(
      new Set(['1-1', '1-3', '1-4', '1-5', '1-6']),
    );

    await service.materializeOne(
      subscription({
        schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
        offDayHandling: SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE,
      }),
    );

    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockBanking.bankExtraDays).not.toHaveBeenCalled();
    expect(mockRepo.extendCycleEnd).not.toHaveBeenCalled();
    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
  });

  it('RELATIVE_DAY: a weekly-off closure is skipped and banked like a holiday', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      closure(TODAY, 'SUBSCRIPTIONS', 'Weekly off'),
    ]);

    await service.materializeOne(subscription());

    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({ bankedDays: 1, reason: 'Weekly off' }),
    );
    expect(mockRepo.extendCycleEnd).toHaveBeenCalledTimes(1);
    expect(mockRepo.findPlanDeliveryDayKeys).not.toHaveBeenCalled();
  });

  it('claims today, delivers once, and reports "processed"', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);

    const outcome = await service.materializeOne(subscription());

    expect(outcome).toBe('processed');
    expect(mockRepo.claimMaterializationDate).toHaveBeenCalledWith(
      'sub1',
      TODAY,
    );
    expect(mockRepo.createMaterializedOrder).toHaveBeenCalledTimes(1);
    // Dated for the tenant-local day, like any other order — not run time.
    expect(mockRepo.createMaterializedOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryDateStr: TODAY }),
    );
  });

  it('does nothing when today is already claimed (second run / second server)', async () => {
    mockRepo.claimMaterializationDate.mockResolvedValue(false);

    const outcome = await service.materializeOne(subscription());

    expect(outcome).toBe('already-done');
    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockRepo.advanceSubscriptionDay).not.toHaveBeenCalled();
  });

  it('hands the day back when processing fails, so the next run retries', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
    mockRepo.createMaterializedOrder.mockRejectedValue(new Error('db blip'));

    await expect(
      service.materializeOne({
        ...subscription(),
        lastMaterializedDate: '2026-09-21',
      }),
    ).rejects.toThrow('db blip');

    expect(mockRepo.releaseMaterializationDate).toHaveBeenCalledWith(
      'sub1',
      TODAY,
      '2026-09-21',
    );
  });

  it('does not claim a day before the plan starts', async () => {
    const outcome = await service.materializeOne({
      ...subscription(),
      startDate: new Date('2026-09-25T00:00:00.000Z'),
    });

    expect(outcome).toBe('not-due');
    expect(mockRepo.claimMaterializationDate).not.toHaveBeenCalled();
  });

  it('delivers normally when there is no closure', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);

    await service.materializeOne(subscription());

    expect(mockRepo.createMaterializedOrder).toHaveBeenCalledTimes(1);
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockRepo.advanceSubscriptionDay).toHaveBeenCalledWith('sub1', 4);
  });

  it('a pending cancellation request holds the day: a linked skip, no order, no advance', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
    mockRepo.findPendingCancellationHold.mockResolvedValue({ id: 'req1' });

    await service.materializeOne(subscription());

    expect(mockRepo.findPendingCancellationHold).toHaveBeenCalledWith(
      'sub1',
      TODAY,
    );
    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: TODAY,
        dateTo: TODAY,
        bankedDays: 0,
        cancellationRequestId: 'req1',
      }),
    );
    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
    expect(mockRepo.advanceSubscriptionDay).not.toHaveBeenCalled();
    expect(mockBanking.bankExtraDays).not.toHaveBeenCalled();
  });

  it('a closure on a held day is compensated as a closure, never also held', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);
    mockRepo.findPendingCancellationHold.mockResolvedValue({ id: 'req1' });

    await service.materializeOne(subscription());

    expect(mockRepo.createSkip).toHaveBeenCalledTimes(1);
    expect(mockRepo.createSkip).not.toHaveBeenCalledWith(
      expect.objectContaining({ cancellationRequestId: 'req1' }),
    );
  });

  it('an ORDERS-only closure does not stop the subscription delivery', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      closure(TODAY, 'ORDERS'),
    ]);

    await service.materializeOne(subscription());

    expect(mockRepo.createMaterializedOrder).toHaveBeenCalledTimes(1);
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
  });

  it('a subscription closure today creates no order and does not advance the template day', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);

    await service.materializeOne(subscription());

    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
    expect(mockRepo.advanceSubscriptionDay).not.toHaveBeenCalled();
  });

  it('RELATIVE_DAY: records a named skip and banks one day through SubscriptionBankingService', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);

    await service.materializeOne(subscription({ cycleEnd: '2026-09-30' }));

    expect(mockRepo.createSkip).toHaveBeenCalledWith({
      subscriptionId: 'sub1',
      dateFrom: TODAY,
      dateTo: TODAY,
      bankedDays: 1,
      reason: 'Founder’s Day',
    });
    expect(mockBanking.bankExtraDays).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        id: 'sub1',
        planId: 'p1',
        cycleEnd: new Date('2026-09-30T00:00:00.000Z'),
        usesDateSelection: false,
      }),
      1,
    );
    expect(mockRepo.extendCycleEnd).toHaveBeenCalledWith(
      'sub1',
      new Date('2026-10-01T00:00:00.000Z'),
      1,
    );
  });

  it('falls back to "Kitchen closed" when the closure has no name', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      closure(TODAY, 'BOTH', null),
    ]);

    await service.materializeOne(subscription());

    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Kitchen closed' }),
    );
  });

  it('WEEKLY_FIXED + LOSS_DELIVERY: skip is recorded but nothing is banked', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);

    await service.materializeOne(
      subscription({
        schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
        offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
      }),
    );

    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({ bankedDays: 0 }),
    );
    expect(mockBanking.bankExtraDays).not.toHaveBeenCalled();
    expect(mockRepo.extendCycleEnd).not.toHaveBeenCalled();
  });

  it('WEEKLY_FIXED + EXTEND_TO_COMPENSATE: banks one day through SubscriptionBankingService', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);

    await service.materializeOne(
      subscription({
        schedulingMode: SubscriptionPlanSchedulingMode.WEEKLY_FIXED,
        offDayHandling: SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE,
        cycleEnd: '2026-09-26',
      }),
    );

    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({ bankedDays: 1 }),
    );
    expect(mockBanking.bankExtraDays).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        cycleEnd: new Date('2026-09-26T00:00:00.000Z'),
      }),
      1,
    );
    expect(mockRepo.extendCycleEnd).toHaveBeenCalledWith(
      'sub1',
      new Date('2026-10-01T00:00:00.000Z'),
      1,
    );
  });

  it('leaves an existing skip alone — no second compensation', async () => {
    mockRepo.findSkipForDate.mockResolvedValue({ id: 'skip1' });
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);

    await service.materializeOne(subscription());

    expect(mockSettingsRepo.findClosedDates).not.toHaveBeenCalled();
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockBanking.bankExtraDays).not.toHaveBeenCalled();
    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
  });
});

describe('SubscriptionMaterializationService — usesDateSelection', () => {
  let service: SubscriptionMaterializationService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    service = new SubscriptionMaterializationService(
      mockRepo as never,
      mockSettingsRepo as never,
      mockBanking as never,
    );
    mockRepo.claimMaterializationDate.mockResolvedValue(true);
    mockRepo.findSkipForDate.mockResolvedValue(null);
    mockRepo.findDayOverride.mockResolvedValue(null);
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
    mockRepo.findPlanDayWithSlots.mockResolvedValue({
      slots: [
        {
          mealId: 'm1',
          meal: { id: 'm1', name: 'Dal Tadka', priceInPaise: 15000 },
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('is a silent no-op when today has no scheduled-date row', async () => {
    mockRepo.findScheduledDate.mockResolvedValue(null);

    await service.materializeOne(subscription({ usesDateSelection: true }));

    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockRepo.advanceSubscriptionDay).not.toHaveBeenCalled();
  });

  it('delivers the running plan day (not the row’s sequence) and advances it', async () => {
    // Row sequence 4, but only 2 earlier dates were delivered (one skipped),
    // so today is Day 3 — a skip shifts menus like a contiguous plan.
    mockRepo.findScheduledDate.mockResolvedValue({ sequence: 4 });

    await service.materializeOne(
      subscription({ usesDateSelection: true, nextPlanDayNumber: 3 }),
    );

    expect(mockRepo.findPlanDayWithSlots).toHaveBeenCalledWith('p1', 3);
    expect(mockRepo.createMaterializedOrder).toHaveBeenCalledTimes(1);
    expect(mockRepo.advanceSubscriptionDay).toHaveBeenCalledWith('sub1', 4);
  });

  it('a closure on a scheduled date still banks through SubscriptionBankingService', async () => {
    mockRepo.findScheduledDate.mockResolvedValue({ sequence: 2 });
    mockSettingsRepo.findClosedDates.mockResolvedValue([closure(TODAY)]);
    mockBanking.bankExtraDays.mockResolvedValue(
      new Date('2026-10-01T00:00:00.000Z'),
    );

    await service.materializeOne(
      subscription({ usesDateSelection: true, cycleEnd: '2026-09-30' }),
    );

    expect(mockRepo.createMaterializedOrder).not.toHaveBeenCalled();
    expect(mockBanking.bankExtraDays).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ usesDateSelection: true }),
      1,
    );
    expect(mockRepo.extendCycleEnd).toHaveBeenCalledWith(
      'sub1',
      new Date('2026-10-01T00:00:00.000Z'),
      1,
    );
  });
});
