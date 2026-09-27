import { OrderAcceptanceService } from './order-acceptance.service';
import { SettingsRepository } from './settings.repository';
import { RedisService } from '../../shared-modules/cache/redis.service';

const mockRepo = {
  findOrderAcceptanceSettings: jest.fn(),
  findBusinessProfile: jest.fn(),
};
const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

// 2026-11-08 is a Sunday; 06:00Z is 11:30 in Asia/Kolkata.
const SUNDAY_NOON_IST = new Date('2026-11-08T06:00:00Z');
const OPEN_ALL_WEEK = {
  mon: { open: '09:00', close: '21:00' },
  tue: { open: '09:00', close: '21:00' },
  wed: { open: '09:00', close: '21:00' },
  thu: { open: '09:00', close: '21:00' },
  fri: { open: '09:00', close: '21:00' },
  sat: { open: '09:00', close: '21:00' },
  sun: { open: '09:00', close: '21:00' },
};

describe('OrderAcceptanceService — closed dates', () => {
  let service: OrderAcceptanceService;

  const withClosedDates = (closedDates: unknown) =>
    mockRepo.findOrderAcceptanceSettings.mockResolvedValue({
      operatingHours: OPEN_ALL_WEEK,
      dailyCutoffTime: null,
      closedDates,
      isTemporarilyClosed: false,
      closureReason: null,
    });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(SUNDAY_NOON_IST);
    service = new OrderAcceptanceService(
      mockRepo as unknown as SettingsRepository,
      mockRedis as unknown as RedisService,
    );
    mockRedis.get.mockResolvedValue(null);
    mockRepo.findBusinessProfile.mockResolvedValue({
      timezone: 'Asia/Kolkata',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('is open on a normal day', async () => {
    withClosedDates([]);
    await expect(service.getStatus('t1')).resolves.toEqual({
      isAcceptingOrders: true,
    });
  });

  it('a legacy string closed date still closes orders', async () => {
    withClosedDates(['2026-11-08']);
    await expect(service.getStatus('t1')).resolves.toEqual({
      isAcceptingOrders: false,
      reason: 'Closed today',
    });
  });

  it('an ORDERS closure with a name puts the name in the reason', async () => {
    withClosedDates([
      { date: '2026-11-08', name: 'Diwali', appliesTo: 'ORDERS' },
    ]);
    await expect(service.getStatus('t1')).resolves.toEqual({
      isAcceptingOrders: false,
      reason: 'Closed today — Diwali',
    });
  });

  it('a BOTH closure closes orders', async () => {
    withClosedDates([{ date: '2026-11-08', appliesTo: 'BOTH' }]);
    const status = await service.getStatus('t1');
    expect(status.isAcceptingOrders).toBe(false);
  });

  it('a SUBSCRIPTIONS-only closure does not close one-off orders', async () => {
    withClosedDates([
      { date: '2026-11-08', name: 'Diwali', appliesTo: 'SUBSCRIPTIONS' },
    ]);
    await expect(service.getStatus('t1')).resolves.toEqual({
      isAcceptingOrders: true,
    });
  });

  it('ignores a closure on a different date', async () => {
    withClosedDates([{ date: '2026-11-09', appliesTo: 'BOTH' }]);
    const status = await service.getStatus('t1');
    expect(status.isAcceptingOrders).toBe(true);
  });
});
