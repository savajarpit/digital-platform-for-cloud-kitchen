import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlanViewMode } from '../../generated/prisma';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import { UpdateSubscriptionSettingsDto } from './dto/update-subscription-settings.dto';

const CALENDAR = 'plan-calendar-view';
const SELECTION = 'delivery-date-selection';

const mockRepo = {
  findSettings: jest.fn(),
  upsertSettings: jest.fn(),
  createSkip: jest.fn(),
  extendCycleEnd: jest.fn(),
  findPublishedPlanById: jest.fn(),
  findPlanForSubscribe: jest.fn(),
  findDeliverySlotById: jest.fn(),
  findPlanDeliveryDayKeys: jest.fn(),
  createSubscription: jest.fn(),
  createScheduledDates: jest.fn(),
  createInvoice: jest.fn(),
  findScheduledDates: jest.fn(),
  findScheduledDate: jest.fn(),
  updateScheduledDateDate: jest.fn(),
  activateSubscription: jest.fn(),
  findSubscriptionForMaterialization: jest.fn(),
  findMySubscriptionById: jest.fn(),
  findSubscriptionById: jest.fn(),
  findPlanScheduleConfig: jest.fn(),
  countActiveSubscriptionsAffectedByDate: jest.fn(),
};
const mockSettingsRepo = {
  findClosedDates: jest.fn(),
  findBusinessProfile: jest.fn(),
  findActiveDeliverySlots: jest.fn(),
};
const mockPromotions = {
  getActiveScheduledDiscountsForPlans: jest.fn(),
  getApplicablePlanBonusDays: jest.fn(),
  validatePlanCoupon: jest.fn(),
  recordPlanCouponRedemption: jest.fn(),
};
const mockFeatures = { hasFeature: jest.fn() };
const mockBanking = { bankExtraDays: jest.fn() };
const mockAddresses = { findOne: jest.fn(), findAll: jest.fn() };
const mockTenantLimits = { assertSubscriberAllowed: jest.fn() };
const mockRazorpay = { createOrder: jest.fn() };
const mockMaterialization = { materializeOne: jest.fn() };

/** Only the two collaborators the settings/entitlement logic touches are
 * real mocks — the rest of the constructor args are never reached. */
function build(): SubscriptionsService {
  const unused = {} as never;
  return new SubscriptionsService(
    mockRepo as never,
    unused,
    mockPromotions as never,
    mockSettingsRepo as never,
    mockFeatures as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    mockBanking as never,
  );
}

/** Full-ish builder for subscribe()/activateSubscriptionNow tests, which
 * touch far more collaborators than the settings/entitlement logic above. */
function buildForSubscribe(): SubscriptionsService {
  const unused = {} as never;
  return new SubscriptionsService(
    mockRepo as never,
    mockAddresses as never,
    mockPromotions as never,
    mockSettingsRepo as never,
    mockFeatures as never,
    mockRazorpay as never,
    unused,
    mockTenantLimits as never,
    mockMaterialization as never,
    unused,
    unused,
    mockBanking as never,
  );
}

/** Grants exactly the listed feature keys. */
function grant(...keys: string[]) {
  mockFeatures.hasFeature.mockImplementation((_t: string, key: string) =>
    Promise.resolve(keys.includes(key)),
  );
}

const dto = (d: Partial<UpdateSubscriptionSettingsDto>) =>
  d as UpdateSubscriptionSettingsDto;

describe('SubscriptionsService — calendar settings', () => {
  let service: SubscriptionsService;

  beforeEach(() => {
    service = build();
    mockRepo.upsertSettings.mockResolvedValue({ id: 's1' });
  });

  afterEach(() => jest.resetAllMocks());

  describe('updateSettings', () => {
    it('rejects CALENDAR view without the calendar feature', async () => {
      grant();
      await expect(
        service.updateSettings(
          't1',
          dto({ planViewMode: SubscriptionPlanViewMode.CALENDAR }),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.upsertSettings).not.toHaveBeenCalled();
    });

    it('rejects BOTH view without the calendar feature', async () => {
      grant();
      await expect(
        service.updateSettings(
          't1',
          dto({ planViewMode: SubscriptionPlanViewMode.BOTH }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('always allows going back to ACCORDION, even without the feature', async () => {
      grant();
      await service.updateSettings(
        't1',
        dto({ planViewMode: SubscriptionPlanViewMode.ACCORDION }),
      );
      expect(mockRepo.upsertSettings).toHaveBeenCalled();
    });

    it('allows CALENDAR view with the calendar feature', async () => {
      grant(CALENDAR);
      await service.updateSettings(
        't1',
        dto({ planViewMode: SubscriptionPlanViewMode.CALENDAR }),
      );
      expect(mockRepo.upsertSettings).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ planViewMode: 'CALENDAR' }),
      );
    });

    it('rejects turning date selection on without its feature', async () => {
      grant(CALENDAR);
      await expect(
        service.updateSettings('t1', dto({ dateSelectionEnabled: true })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects date selection when only the child grant exists (parent off)', async () => {
      grant(SELECTION);
      await expect(
        service.updateSettings('t1', dto({ dateSelectionEnabled: true })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects allow-change-after-purchase without date selection', async () => {
      grant(CALENDAR);
      await expect(
        service.updateSettings(
          't1',
          dto({ allowDateChangeAfterPurchase: true }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows date selection with both features', async () => {
      grant(CALENDAR, SELECTION);
      await service.updateSettings(
        't1',
        dto({ dateSelectionEnabled: true, allowDateChangeAfterPurchase: true }),
      );
      expect(mockRepo.upsertSettings).toHaveBeenCalled();
    });

    it('turning switches off is always allowed, even with no grants', async () => {
      grant();
      await service.updateSettings(
        't1',
        dto({
          dateSelectionEnabled: false,
          allowDateChangeAfterPurchase: false,
          selectionFlexibilityDays: 3,
        }),
      );
      expect(mockRepo.upsertSettings).toHaveBeenCalled();
    });

    it('returns the saved row with the grant flags, like getSettings', async () => {
      grant(CALENDAR);
      mockRepo.upsertSettings.mockResolvedValue({
        id: 's1',
        planViewMode: 'CALENDAR',
      });

      const result = await service.updateSettings(
        't1',
        dto({ planViewMode: SubscriptionPlanViewMode.CALENDAR }),
      );

      expect(result).toMatchObject({
        planViewMode: 'CALENDAR',
        calendarViewGranted: true,
        dateSelectionGranted: false,
      });
    });
  });

  describe('getSettings', () => {
    it('returns defaults and grant flags when no row exists', async () => {
      mockRepo.findSettings.mockResolvedValue(null);
      grant(CALENDAR);

      const result = await service.getSettings('t1');

      expect(result).toMatchObject({
        planViewMode: 'ACCORDION',
        dateSelectionEnabled: false,
        selectionFlexibilityDays: 7,
        allowDateChangeAfterPurchase: false,
        calendarViewGranted: true,
        dateSelectionGranted: false,
      });
    });

    it('reports date selection as not granted when the parent is missing', async () => {
      mockRepo.findSettings.mockResolvedValue({ id: 's1' });
      grant(SELECTION);

      const result = await service.getSettings('t1');

      expect(result.calendarViewGranted).toBe(false);
      expect(result.dateSelectionGranted).toBe(false);
    });
  });

  describe('getPublicSettings', () => {
    const stored = {
      isEnabled: true,
      planViewMode: SubscriptionPlanViewMode.BOTH,
      dateSelectionEnabled: true,
      selectionFlexibilityDays: 10,
      allowDateChangeAfterPurchase: true,
    };

    it('exposes the stored calendar settings when fully entitled', async () => {
      mockRepo.findSettings.mockResolvedValue(stored);
      grant('subscriptions', CALENDAR, SELECTION);

      const result = await service.getPublicSettings('t1');

      expect(result).toMatchObject({
        planViewMode: 'BOTH',
        dateSelectionEnabled: true,
        selectionFlexibilityDays: 10,
        allowDateChangeAfterPurchase: true,
      });
    });

    it('downgrades to accordion with no selection when the grant is revoked', async () => {
      // A stored CALENDAR/BOTH must never reach a tenant that lost the grant.
      mockRepo.findSettings.mockResolvedValue(stored);
      grant('subscriptions');

      const result = await service.getPublicSettings('t1');

      expect(result.planViewMode).toBe('ACCORDION');
      expect(result.dateSelectionEnabled).toBe(false);
      expect(result.allowDateChangeAfterPurchase).toBe(false);
    });

    it('keeps the calendar but drops selection when only the calendar is granted', async () => {
      mockRepo.findSettings.mockResolvedValue(stored);
      grant('subscriptions', CALENDAR);

      const result = await service.getPublicSettings('t1');

      expect(result.planViewMode).toBe('BOTH');
      expect(result.dateSelectionEnabled).toBe(false);
      expect(result.allowDateChangeAfterPurchase).toBe(false);
    });

    it('falls back to accordion/off/7 when no settings row exists', async () => {
      mockRepo.findSettings.mockResolvedValue(null);
      grant('subscriptions', CALENDAR, SELECTION);

      const result = await service.getPublicSettings('t1');

      expect(result).toMatchObject({
        planViewMode: 'ACCORDION',
        dateSelectionEnabled: false,
        selectionFlexibilityDays: 7,
        allowDateChangeAfterPurchase: false,
      });
    });
  });
});

describe('SubscriptionsService — skipping a closed date', () => {
  let service: SubscriptionsService;
  const subscription = {
    id: 'sub1',
    planId: 'p1',
    cycleEnd: new Date('2026-09-30T00:00:00.000Z'),
  };

  beforeEach(() => {
    service = build();
    const internals = service as unknown as Record<string, jest.Mock>;
    internals.getTenantActiveSubscription = jest
      .fn()
      .mockResolvedValue(subscription);
    internals.assertWithinNoticeWindow = jest.fn().mockResolvedValue(undefined);
    mockBanking.bankExtraDays.mockResolvedValue(
      new Date('2026-10-01T00:00:00.000Z'),
    );
  });

  afterEach(() => jest.resetAllMocks());

  it('rejects skipping a date the kitchen is closed for subscriptions', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      {
        date: '2026-09-26',
        name: 'Founder’s Day',
        note: null,
        appliesTo: 'BOTH',
      },
    ]);

    await expect(
      service.skipDayAdmin('t1', 'sub1', { date: '2026-09-26' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.createSkip).not.toHaveBeenCalled();
    expect(mockRepo.extendCycleEnd).not.toHaveBeenCalled();
  });

  it('still skips a date whose closure only applies to orders', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      { date: '2026-09-26', name: null, note: null, appliesTo: 'ORDERS' },
    ]);

    await service.skipDayAdmin('t1', 'sub1', { date: '2026-09-26' });

    expect(mockRepo.createSkip).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-09-26', bankedDays: 1 }),
    );
  });

  it('skips a normal date', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);

    await service.skipDayAdmin('t1', 'sub1', { date: '2026-09-25' });

    expect(mockRepo.createSkip).toHaveBeenCalledTimes(1);
    expect(mockRepo.extendCycleEnd).toHaveBeenCalledWith(
      'sub1',
      new Date('2026-10-01T00:00:00.000Z'),
      1,
    );
  });

  it('routes the actual banking through SubscriptionBankingService, not a local reimplementation', async () => {
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);

    await service.skipDayAdmin('t1', 'sub1', { date: '2026-09-25' });

    expect(mockBanking.bankExtraDays).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ id: 'sub1', planId: 'p1' }),
      1,
    );
  });
});

describe('SubscriptionsService — storefront plan calendar', () => {
  let service: SubscriptionsService;

  const plan = {
    id: 'p1',
    durationDays: 3,
    schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
    weekCount: null,
    scheduleAnchorDate: null,
    offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
    days: [1, 2, 3].map((dayNumber) => ({
      dayNumber,
      weekNumber: null,
      weekday: null,
      slots: [
        {
          slotType: 'LUNCH',
          meal: {
            id: `m${dayNumber}`,
            name: `Meal ${dayNumber}`,
            imageUrl: null,
          },
        },
      ],
    })),
  };

  /** Tuesday 22 Sep 2026, 08:30 IST. */
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-22T03:00:00Z'));
    service = build();
    mockRepo.findPublishedPlanById.mockResolvedValue(plan);
    mockPromotions.getActiveScheduledDiscountsForPlans.mockResolvedValue(
      new Map(),
    );
    mockPromotions.getApplicablePlanBonusDays.mockResolvedValue(0);
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('has no dateSelection when the tenant has not enabled it', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.ACCORDION,
      dateSelectionEnabled: false,
    });
    grant('subscriptions', CALENDAR, SELECTION);

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.dateSelection).toBeNull();
  });

  it('has no dateSelection without the delivery-date-selection grant, even if enabled', async () => {
    mockRepo.findSettings.mockResolvedValue({ dateSelectionEnabled: true });
    grant('subscriptions', CALENDAR);

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.dateSelection).toBeNull();
  });

  it('exposes the candidate window and required count when entitled and enabled', async () => {
    mockRepo.findSettings.mockResolvedValue({
      dateSelectionEnabled: true,
      selectionFlexibilityDays: 2,
      startDateLeadDays: 1,
    });
    grant('subscriptions', CALENDAR, SELECTION);

    const result = await service.findPublishedPlan('t1', 'p1');

    // duration(3) + bonus(0) = 3 required; window = 3 + flexibility(2) = 5
    // calendar days from 2026-09-23 (tomorrow).
    expect(result.dateSelection).toEqual({
      requiredCount: 3,
      candidates: [
        '2026-09-23',
        '2026-09-24',
        '2026-09-25',
        '2026-09-26',
        '2026-09-27',
      ],
      unavailable: [],
      manualSelection: true,
      mealsByDate: null,
    });
  });

  it('skips a subscription-affecting closed date without shrinking the window, and reports it as a holiday', async () => {
    mockRepo.findSettings.mockResolvedValue({
      dateSelectionEnabled: true,
      selectionFlexibilityDays: 0,
      startDateLeadDays: 1,
    });
    grant('subscriptions', CALENDAR, SELECTION);
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      { date: '2026-09-24', name: 'Diwali', note: null, appliesTo: 'BOTH' },
    ]);

    const result = await service.findPublishedPlan('t1', 'p1');

    // 3 required + 0 flexibility = 3 real delivery days, the holiday skipped.
    expect(result.dateSelection?.candidates).toEqual([
      '2026-09-23',
      '2026-09-25',
      '2026-09-26',
    ]);
    expect(result.dateSelection?.unavailable).toEqual([
      {
        date: '2026-09-24',
        kind: 'HOLIDAY',
        holiday: { name: 'Diwali', note: null },
      },
    ]);
  });

  it('ignores an orders-only closed date in the subscription window', async () => {
    mockRepo.findSettings.mockResolvedValue({
      dateSelectionEnabled: true,
      selectionFlexibilityDays: 0,
      startDateLeadDays: 1,
    });
    grant('subscriptions', CALENDAR, SELECTION);
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      {
        date: '2026-09-24',
        name: 'Stock-taking',
        note: null,
        appliesTo: 'ORDERS',
      },
    ]);

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.dateSelection?.candidates).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
    expect(result.dateSelection?.unavailable).toEqual([]);
  });

  it('flags a long plan as not manual (pre-selected, exceptions-only)', async () => {
    mockRepo.findSettings.mockResolvedValue({ dateSelectionEnabled: true });
    grant('subscriptions', CALENDAR, SELECTION);
    mockPromotions.getApplicablePlanBonusDays.mockResolvedValue(5); // 3 + 5 = 8 > 7

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.dateSelection?.requiredCount).toBe(8);
    expect(result.dateSelection?.manualSelection).toBe(false);
  });

  it('has no calendar for a tenant that stayed on the accordion view', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.ACCORDION,
    });
    grant('subscriptions', CALENDAR);

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.calendar).toBeNull();
    expect(result.viewMode).toBe('ACCORDION');
  });

  it('has no calendar without the feature grant, even if CALENDAR is stored', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.CALENDAR,
    });
    grant('subscriptions');

    const result = await service.findPublishedPlan('t1', 'p1');

    expect(result.calendar).toBeNull();
    expect(result.viewMode).toBe('ACCORDION');
  });

  it('builds the calendar from tomorrow (default lead) when entitled', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.BOTH,
      startDateLeadDays: 1,
    });
    grant('subscriptions', CALENDAR);

    const { calendar, viewMode } = await service.findPublishedPlan('t1', 'p1');

    expect(viewMode).toBe('BOTH');
    expect(calendar?.startDate).toBe('2026-09-23');
    expect(calendar?.days.map((d) => d.dayLabel)).toEqual([
      'Day 1',
      'Day 2',
      'Day 3',
    ]);
  });

  it('honours the tenant’s start-date lead days', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.CALENDAR,
      startDateLeadDays: 3,
    });
    grant('subscriptions', CALENDAR);

    const { calendar } = await service.findPublishedPlan('t1', 'p1');

    expect(calendar?.startDate).toBe('2026-09-25');
  });

  it('marks a subscription closure as a holiday and ignores an orders-only one', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.CALENDAR,
      startDateLeadDays: 1,
    });
    grant('subscriptions', CALENDAR);
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      { date: '2026-09-23', name: 'Diwali', note: null, appliesTo: 'BOTH' },
      {
        date: '2026-09-24',
        name: 'Orders only',
        note: null,
        appliesTo: 'ORDERS',
      },
    ]);

    const { calendar } = await service.findPublishedPlan('t1', 'p1');

    expect(calendar?.days.map((d) => [d.date, d.kind])).toEqual([
      ['2026-09-23', 'HOLIDAY'],
      ['2026-09-24', 'DELIVERY'],
      ['2026-09-25', 'DELIVERY'],
      ['2026-09-26', 'DELIVERY'],
    ]);
  });
});

describe('SubscriptionsService.subscribe — delivery date selection', () => {
  let service: SubscriptionsService;

  const plan = {
    id: 'p1',
    name: 'Weekly Balanced Plan',
    priceInPaise: 100000,
    durationDays: 3,
    schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
    weekCount: null,
    scheduleAnchorDate: null,
    offDayHandling: SubscriptionOffDayHandling.LOSS_DELIVERY,
  };

  // Tuesday 22 Sep 2026, 08:30 IST: tenant "today" is 2026-09-22 and, with
  // the default 1-day lead, the selection window starts 2026-09-23.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-22T03:00:00Z'));
    service = buildForSubscribe();
    mockRepo.findSettings.mockResolvedValue({
      isEnabled: true,
      isAcceptingNewSubscriptions: true,
      dateSelectionEnabled: true,
      selectionFlexibilityDays: 2,
      startDateLeadDays: 1,
    });
    mockTenantLimits.assertSubscriberAllowed.mockResolvedValue(undefined);
    mockRepo.findPlanForSubscribe.mockResolvedValue(plan);
    mockAddresses.findOne.mockResolvedValue({ id: 'addr1' });
    mockPromotions.getActiveScheduledDiscountsForPlans.mockResolvedValue(
      new Map(),
    );
    mockPromotions.getApplicablePlanBonusDays.mockResolvedValue(0);
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
    mockRepo.createSubscription.mockResolvedValue({ id: 'sub1' });
    mockRazorpay.createOrder.mockResolvedValue({
      razorpayOrderId: 'order_1',
      keyId: 'key_1',
    });
    mockRepo.createInvoice.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('rejects with no calendar/selection grant even if the customer sends dates', async () => {
    grant('subscriptions');

    await expect(
      service.subscribe('t1', 'u1', {
        planId: 'p1',
        addressId: 'addr1',
        deliveryDates: ['2026-09-23', '2026-09-24', '2026-09-25'],
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.createSubscription).not.toHaveBeenCalled();
  });

  it('subscribes normally with no dates when selection is not enabled', async () => {
    grant('subscriptions');
    mockRepo.findSettings.mockResolvedValue({
      isEnabled: true,
      isAcceptingNewSubscriptions: true,
      dateSelectionEnabled: false,
    });

    await service.subscribe('t1', 'u1', {
      planId: 'p1',
      addressId: 'addr1',
    } as never);

    expect(mockRepo.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ usesDateSelection: false }),
    );
    expect(mockRepo.createScheduledDates).not.toHaveBeenCalled();
  });

  it('requires deliveryDates when selection is active', async () => {
    grant('subscriptions', CALENDAR, SELECTION);

    await expect(
      service.subscribe('t1', 'u1', {
        planId: 'p1',
        addressId: 'addr1',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.createSubscription).not.toHaveBeenCalled();
  });

  it('rejects the wrong count of dates', async () => {
    grant('subscriptions', CALENDAR, SELECTION);

    await expect(
      service.subscribe('t1', 'u1', {
        planId: 'p1',
        addressId: 'addr1',
        deliveryDates: ['2026-09-23', '2026-09-24'],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a date outside the selection window', async () => {
    grant('subscriptions', CALENDAR, SELECTION);

    await expect(
      service.subscribe('t1', 'u1', {
        planId: 'p1',
        addressId: 'addr1',
        // window is duration(3) + flexibility(2) = 5 days from 2026-09-23,
        // i.e. up to 2026-09-27 -- 2026-09-30 is out of range.
        deliveryDates: ['2026-09-23', '2026-09-24', '2026-09-30'],
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.createSubscription).not.toHaveBeenCalled();
  });

  it('accepts a valid selection, sorts it, and stores it with sequence 1..N', async () => {
    grant('subscriptions', CALENDAR, SELECTION);

    await service.subscribe('t1', 'u1', {
      planId: 'p1',
      addressId: 'addr1',
      deliveryDates: ['2026-09-25', '2026-09-23', '2026-09-24'],
    } as never);

    expect(mockRepo.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        usesDateSelection: true,
        durationDaysSnapshot: 3,
      }),
    );
    expect(mockRepo.createScheduledDates).toHaveBeenCalledWith('sub1', [
      { date: '2026-09-23', sequence: 1 },
      { date: '2026-09-24', sequence: 2 },
      { date: '2026-09-25', sequence: 3 },
    ]);
  });

  it('excludes a tenant closed date from the selection window', async () => {
    grant('subscriptions', CALENDAR, SELECTION);
    mockSettingsRepo.findClosedDates.mockResolvedValue([
      {
        date: '2026-09-24',
        name: 'Diwali',
        note: null,
        appliesTo: 'SUBSCRIPTIONS',
      },
    ]);

    await expect(
      service.subscribe('t1', 'u1', {
        planId: 'p1',
        addressId: 'addr1',
        deliveryDates: ['2026-09-23', '2026-09-24', '2026-09-25'],
      } as never),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('SubscriptionsService — activating a date-selection subscription', () => {
  let service: SubscriptionsService;
  type Internals = {
    activateSubscriptionNow: (
      tenantId: string,
      subscription: {
        id: string;
        planId: string;
        durationDaysSnapshot: number;
        usesDateSelection: boolean;
      },
    ) => Promise<void>;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-22T03:00:00Z'));
    service = buildForSubscribe();
    mockRepo.activateSubscription.mockResolvedValue({});
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('derives startDate/cycleEnd from the stored scheduled dates, not a recomputed window', async () => {
    mockRepo.findScheduledDates.mockResolvedValue([
      { date: '2026-09-25', sequence: 1 },
      { date: '2026-09-26', sequence: 2 },
      { date: '2026-09-27', sequence: 3 },
    ]);

    await (service as unknown as Internals).activateSubscriptionNow('t1', {
      id: 'sub1',
      planId: 'p1',
      durationDaysSnapshot: 3,
      usesDateSelection: true,
    });

    expect(mockRepo.activateSubscription).toHaveBeenCalledWith('sub1', {
      startDate: new Date('2026-09-25T00:00:00.000Z'),
      cycleEnd: new Date('2026-09-27T00:00:00.000Z'),
    });
    // Today (22 Sep) is before the first scheduled date (25 Sep): no inline materialize.
    expect(mockMaterialization.materializeOne).not.toHaveBeenCalled();
  });

  it('materializes inline when the first scheduled date is today or earlier', async () => {
    mockRepo.findScheduledDates.mockResolvedValue([
      { date: '2026-09-22', sequence: 1 },
      { date: '2026-09-23', sequence: 2 },
    ]);
    mockRepo.findSubscriptionForMaterialization.mockResolvedValue({
      id: 'sub1',
    });

    await (service as unknown as Internals).activateSubscriptionNow('t1', {
      id: 'sub1',
      planId: 'p1',
      durationDaysSnapshot: 2,
      usesDateSelection: true,
    });

    expect(mockMaterialization.materializeOne).toHaveBeenCalledWith({
      id: 'sub1',
    });
  });
});

describe('SubscriptionsService.findMySubscription — calendar/viewMode/canMoveDates', () => {
  let service: SubscriptionsService;

  const storedSubscription = {
    id: 'sub1',
    userId: 'u1',
    addressId: 'addr1',
    deliverySlotId: null,
    usesDateSelection: true,
    startDate: new Date('2026-09-20T00:00:00.000Z'),
    cycleEnd: new Date('2026-09-22T00:00:00.000Z'),
    nextPlanDayNumber: 1,
    skips: [],
    dayOverrides: [],
    scheduledDates: [
      { date: '2026-09-20', sequence: 1 },
      { date: '2026-09-21', sequence: 2 },
      { date: '2026-09-22', sequence: 3 },
    ],
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
      weekCount: null,
      scheduleAnchorDate: null,
      durationDays: 3,
      days: [1, 2, 3].map((dayNumber) => ({
        dayNumber,
        weekNumber: null,
        weekday: null,
        slots: [],
      })),
    },
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T03:00:00Z'));
    service = buildForSubscribe();
    mockRepo.findMySubscriptionById.mockResolvedValue(storedSubscription);
    mockAddresses.findAll.mockResolvedValue([]);
    mockSettingsRepo.findActiveDeliverySlots.mockResolvedValue([]);
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('downgrades viewMode to ACCORDION and reports canMoveDates false with no grants', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.BOTH,
      allowDateChangeAfterPurchase: true,
      noticeHoursBeforeDelivery: 24,
    });
    grant('subscriptions');

    const result = await service.findMySubscription('t1', 'u1', 'sub1');

    expect(result.viewMode).toBe('ACCORDION');
    expect(result.canMoveDates).toBe(false);
    expect(result.calendar.length).toBeGreaterThan(0);
  });

  it('exposes BOTH viewMode and canMoveDates true when fully granted and enabled', async () => {
    mockRepo.findSettings.mockResolvedValue({
      planViewMode: SubscriptionPlanViewMode.BOTH,
      allowDateChangeAfterPurchase: true,
      noticeHoursBeforeDelivery: 24,
    });
    grant('subscriptions', CALENDAR, SELECTION);

    const result = await service.findMySubscription('t1', 'u1', 'sub1');

    expect(result.viewMode).toBe('BOTH');
    expect(result.canMoveDates).toBe(true);
  });

  it('canMoveDates is false for a subscription that never used date selection', async () => {
    mockRepo.findMySubscriptionById.mockResolvedValue({
      ...storedSubscription,
      usesDateSelection: false,
      scheduledDates: [],
    });
    mockRepo.findSettings.mockResolvedValue({
      allowDateChangeAfterPurchase: true,
      noticeHoursBeforeDelivery: 24,
    });
    grant('subscriptions', CALENDAR, SELECTION);

    const result = await service.findMySubscription('t1', 'u1', 'sub1');

    expect(result.canMoveDates).toBe(false);
  });

  it('builds a calendar spanning the stored scheduled dates', async () => {
    mockRepo.findSettings.mockResolvedValue({ noticeHoursBeforeDelivery: 24 });
    grant('subscriptions');

    const result = await service.findMySubscription('t1', 'u1', 'sub1');

    expect(result.calendar.map((d: { date: string }) => d.date)).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
    ]);
  });
});

describe('SubscriptionsService — moving a delivery date', () => {
  let service: SubscriptionsService;

  const ownedSubscription = {
    id: 'sub1',
    userId: 'u1',
    tenantId: 't1',
    status: 'ACTIVE',
    planId: 'p1',
    durationDaysSnapshot: 3,
    usesDateSelection: true,
    startDate: new Date('2026-09-20T00:00:00.000Z'),
    cycleEnd: new Date('2026-09-22T00:00:00.000Z'),
  };
  const plan = {
    schedulingMode: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
    weekCount: null,
    scheduleAnchorDate: null,
    durationDays: 3,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T03:00:00Z'));
    service = buildForSubscribe();
    mockRepo.findSubscriptionById.mockResolvedValue(ownedSubscription);
    mockRepo.findPlanScheduleConfig.mockResolvedValue(plan);
    mockSettingsRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
    mockSettingsRepo.findClosedDates.mockResolvedValue([]);
    mockRepo.findSettings.mockResolvedValue({
      allowDateChangeAfterPurchase: true,
      noticeHoursBeforeDelivery: 24,
      selectionFlexibilityDays: 7,
    });
    mockRepo.findScheduledDate.mockResolvedValue({
      date: '2026-09-21',
      sequence: 2,
    });
    mockRepo.findScheduledDates.mockResolvedValue([
      { date: '2026-09-20', sequence: 1 },
      { date: '2026-09-21', sequence: 2 },
      { date: '2026-09-22', sequence: 3 },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('getMoveCandidates', () => {
    it('rejects when the tenant has not enabled moving dates', async () => {
      grant('subscriptions', CALENDAR, SELECTION);
      mockRepo.findSettings.mockResolvedValue({
        allowDateChangeAfterPurchase: false,
        noticeHoursBeforeDelivery: 24,
      });

      await expect(
        service.getMoveCandidates('t1', 'u1', 'sub1', '2026-09-21'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the subscription never used date selection', async () => {
      mockRepo.findSubscriptionById.mockResolvedValue({
        ...ownedSubscription,
        usesDateSelection: false,
      });
      grant('subscriptions', CALENDAR, SELECTION);

      await expect(
        service.getMoveCandidates('t1', 'u1', 'sub1', '2026-09-21'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a date that is not actually scheduled', async () => {
      grant('subscriptions', CALENDAR, SELECTION);
      mockRepo.findScheduledDate.mockResolvedValue(null);

      await expect(
        service.getMoveCandidates('t1', 'u1', 'sub1', '2026-09-25'),
      ).rejects.toThrow(BadRequestException);
    });

    it('excludes the date itself and every already-scheduled date', async () => {
      grant('subscriptions', CALENDAR, SELECTION);

      const candidates = await service.getMoveCandidates(
        't1',
        'u1',
        'sub1',
        '2026-09-21',
      );

      // Window: duration(3) + flexibility(7) = 10 days from startDate 2026-09-20.
      expect(candidates).not.toContain('2026-09-21');
      expect(candidates).not.toContain('2026-09-20');
      expect(candidates).not.toContain('2026-09-22');
      expect(candidates).toContain('2026-09-23');
    });
  });

  describe('moveDeliveryDate', () => {
    it('rejects moving to a date outside the candidate window', async () => {
      grant('subscriptions', CALENDAR, SELECTION);

      await expect(
        service.moveDeliveryDate(
          't1',
          'u1',
          'sub1',
          '2026-09-21',
          '2026-10-05',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.updateScheduledDateDate).not.toHaveBeenCalled();
    });

    it('relocates the row and recomputes startDate/cycleEnd from the new spread', async () => {
      grant('subscriptions', CALENDAR, SELECTION);
      mockRepo.updateScheduledDateDate.mockResolvedValue({});
      // After moving 09-21 -> 09-24, the stored rows (as re-fetched) look like this.
      mockRepo.findScheduledDates
        .mockResolvedValueOnce([
          { date: '2026-09-20', sequence: 1 },
          { date: '2026-09-21', sequence: 2 },
          { date: '2026-09-22', sequence: 3 },
        ])
        .mockResolvedValueOnce([
          { date: '2026-09-20', sequence: 1 },
          { date: '2026-09-22', sequence: 3 },
          { date: '2026-09-24', sequence: 2 },
        ]);
      mockRepo.activateSubscription.mockResolvedValue({});
      mockRepo.findMySubscriptionById.mockResolvedValue({
        ...ownedSubscription,
        skips: [],
        dayOverrides: [],
        scheduledDates: [],
        plan: { ...plan, days: [] },
      });
      mockAddresses.findAll.mockResolvedValue([]);
      mockSettingsRepo.findActiveDeliverySlots.mockResolvedValue([]);

      await service.moveDeliveryDate(
        't1',
        'u1',
        'sub1',
        '2026-09-21',
        '2026-09-24',
      );

      expect(mockRepo.updateScheduledDateDate).toHaveBeenCalledWith(
        'sub1',
        '2026-09-21',
        '2026-09-24',
      );
      expect(mockRepo.activateSubscription).toHaveBeenCalledWith('sub1', {
        startDate: new Date('2026-09-20T00:00:00.000Z'),
        cycleEnd: new Date('2026-09-24T00:00:00.000Z'),
      });
    });
  });
});

describe('SubscriptionsService.countSubscribersAffectedByDate', () => {
  it('delegates straight to the repository', async () => {
    const service = build();
    mockRepo.countActiveSubscriptionsAffectedByDate.mockResolvedValue(12);

    const result = await service.countSubscribersAffectedByDate(
      't1',
      '2026-09-26',
    );

    expect(result).toEqual({ count: 12 });
    expect(
      mockRepo.countActiveSubscriptionsAffectedByDate,
    ).toHaveBeenCalledWith('t1', '2026-09-26');
  });
});
