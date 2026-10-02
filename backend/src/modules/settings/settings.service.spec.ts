import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import { FeaturesService } from '../features/features.service';
import { UpdateOrderAcceptanceDto } from './dto/update-order-acceptance.dto';

const mockSettingsRepo = {
  findOrderAcceptanceSettings: jest.fn(),
  upsertOrderAcceptanceSettings: jest.fn(),
  findInstantDeliverySettings: jest.fn(),
  upsertInstantDeliverySettings: jest.fn(),
  findDeliverySlotById: jest.fn(),
  findDeliverySlotByName: jest.fn(),
  findAllDeliverySlots: jest.fn(),
  createDeliverySlot: jest.fn(),
  updateDeliverySlot: jest.fn(),
  deleteDeliverySlot: jest.fn(),
  countDeliverySlotUsage: jest.fn(),
  findBusinessProfile: jest.fn(),
};
const mockFeatures = { hasFeature: jest.fn() };

function build(): SettingsService {
  return new SettingsService(
    mockSettingsRepo as unknown as SettingsRepository,
    {} as ConfigService,
    {} as PlatformSettingsService,
    mockFeatures as unknown as FeaturesService,
  );
}

/** The `data` argument of every upsert call so far. */
function upsertedData(): Record<string, unknown>[] {
  const calls = mockSettingsRepo.upsertOrderAcceptanceSettings.mock.calls as [
    string,
    Record<string, unknown>,
  ][];
  return calls.map(([, data]) => data);
}

/** Echoes back whatever was upserted, like the real repo does. */
function echoUpsert() {
  mockSettingsRepo.upsertOrderAcceptanceSettings.mockImplementation(
    (_tenantId: string, data: Record<string, unknown>) =>
      Promise.resolve({ id: 's1', tenantId: 't1', closedDates: [], ...data }),
  );
}

describe('SettingsService — closed dates', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = build();
    echoUpsert();
  });

  afterEach(() => jest.resetAllMocks());

  describe('getOrderAcceptanceSettings', () => {
    it('returns null when nothing is configured yet', async () => {
      mockSettingsRepo.findOrderAcceptanceSettings.mockResolvedValue(null);
      await expect(
        service.getOrderAcceptanceSettings('t1'),
      ).resolves.toBeNull();
    });

    it('upgrades legacy string[] closed dates to the object shape', async () => {
      mockSettingsRepo.findOrderAcceptanceSettings.mockResolvedValue({
        id: 's1',
        closedDates: ['2026-12-25'],
      });

      const result = await service.getOrderAcceptanceSettings('t1');

      expect(result?.closedDates).toEqual([
        { date: '2026-12-25', name: null, note: null, appliesTo: 'ORDERS' },
      ]);
    });
  });

  describe('updateOrderAcceptance', () => {
    it('stores entries sorted by date, de-duplicated (last one wins), trimmed', async () => {
      const dto = {
        closedDates: [
          { date: '2026-11-08', name: '  Diwali ', appliesTo: 'ORDERS' },
          { date: '2026-10-20', name: 'Dussehra' },
          { date: '2026-11-08', name: 'Diwali', note: ' Closed ' },
        ],
      } as UpdateOrderAcceptanceDto;

      const result = await service.updateOrderAcceptance('t1', dto);

      expect(result.closedDates).toEqual([
        {
          date: '2026-10-20',
          name: 'Dussehra',
          note: null,
          appliesTo: 'ORDERS',
        },
        {
          date: '2026-11-08',
          name: 'Diwali',
          note: 'Closed',
          appliesTo: 'ORDERS',
        },
      ]);
    });

    it('does not touch closedDates when the DTO omits them', async () => {
      await service.updateOrderAcceptance('t1', {
        isTemporarilyClosed: true,
      } as UpdateOrderAcceptanceDto);

      expect(upsertedData()[0]).not.toHaveProperty('closedDates');
      expect(mockFeatures.hasFeature).not.toHaveBeenCalled();
    });

    it('rejects a subscription-affecting closure without the calendar feature', async () => {
      mockFeatures.hasFeature.mockResolvedValue(false);

      await expect(
        service.updateOrderAcceptance('t1', {
          closedDates: [{ date: '2026-11-08', appliesTo: 'SUBSCRIPTIONS' }],
        } as UpdateOrderAcceptanceDto),
      ).rejects.toThrow(ForbiddenException);
      expect(
        mockSettingsRepo.upsertOrderAcceptanceSettings,
      ).not.toHaveBeenCalled();
    });

    it('allows a subscription-affecting closure with the calendar feature', async () => {
      mockFeatures.hasFeature.mockResolvedValue(true);

      const result = await service.updateOrderAcceptance('t1', {
        closedDates: [{ date: '2026-11-08', appliesTo: 'BOTH' }],
      } as UpdateOrderAcceptanceDto);

      expect(result.closedDates[0].appliesTo).toBe('BOTH');
      expect(mockFeatures.hasFeature).toHaveBeenCalledWith(
        't1',
        'plan-calendar-view',
      );
    });

    it('rejects an impossible closed date without saving', async () => {
      await expect(
        service.updateOrderAcceptance('t1', {
          closedDates: [{ date: '2026-02-30' }],
        } as UpdateOrderAcceptanceDto),
      ).rejects.toThrow(BadRequestException);
      expect(
        mockSettingsRepo.upsertOrderAcceptanceSettings,
      ).not.toHaveBeenCalled();
    });

    it('needs no feature for orders-only closures', async () => {
      await service.updateOrderAcceptance('t1', {
        closedDates: [{ date: '2026-11-08' }],
      } as UpdateOrderAcceptanceDto);

      expect(mockFeatures.hasFeature).not.toHaveBeenCalled();
    });
  });

  describe('delivery slots', () => {
    const lunch = {
      id: 'slot1',
      name: 'Lunch',
      startTime: '12:00',
      endTime: '15:00',
    };

    it('creates a slot with a trimmed name, placed after the existing ones', async () => {
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);
      mockSettingsRepo.findAllDeliverySlots.mockResolvedValue([
        { sortOrder: 1 },
        { sortOrder: 3 },
      ]);
      mockSettingsRepo.createDeliverySlot.mockResolvedValue({});

      await service.createDeliverySlot('t1', {
        name: '  Brunch ',
        startTime: '10:00',
        endTime: '12:00',
      });

      expect(mockSettingsRepo.createDeliverySlot).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ name: 'Brunch', sortOrder: 4 }),
      );
    });

    it('rejects a blank name, an inverted window and a duplicate name', async () => {
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);
      await expect(
        service.createDeliverySlot('t1', {
          name: '  ',
          startTime: '10:00',
          endTime: '12:00',
        }),
      ).rejects.toThrow('Give the slot a name.');
      await expect(
        service.createDeliverySlot('t1', {
          name: 'Late',
          startTime: '15:00',
          endTime: '12:00',
        }),
      ).rejects.toThrow(/must end after/);

      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(lunch);
      await expect(
        service.createDeliverySlot('t1', {
          name: 'lunch',
          startTime: '16:00',
          endTime: '17:00',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockSettingsRepo.createDeliverySlot).not.toHaveBeenCalled();
    });

    it('validates a one-field update against the saved slot', async () => {
      mockSettingsRepo.findDeliverySlotById.mockResolvedValue(lunch);
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);

      // Saved start is 12:00 — an end of 11:00 inverts it.
      await expect(
        service.updateDeliverySlot('t1', 'slot1', { endTime: '11:00' }),
      ).rejects.toThrow(/must end after/);
      expect(mockSettingsRepo.findDeliverySlotByName).not.toHaveBeenCalled();
    });

    it('refuses to delete a slot that is still in use', async () => {
      mockSettingsRepo.findDeliverySlotById.mockResolvedValue(lunch);
      mockSettingsRepo.findBusinessProfile.mockResolvedValue(null);
      mockSettingsRepo.countDeliverySlotUsage.mockResolvedValue({
        subscriptions: 2,
        dayChanges: 0,
        orders: 1,
      });

      await expect(service.deleteDeliverySlot('t1', 'slot1')).rejects.toThrow(
        /still used by 2 active subscriptions and 1 upcoming order/,
      );
      expect(mockSettingsRepo.deleteDeliverySlot).not.toHaveBeenCalled();
    });

    it('needs the subscriptions feature to split a slot, not to keep it BOTH', async () => {
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);
      mockSettingsRepo.findAllDeliverySlots.mockResolvedValue([]);
      mockSettingsRepo.createDeliverySlot.mockResolvedValue({});
      mockFeatures.hasFeature.mockResolvedValue(false);

      await expect(
        service.createDeliverySlot('t1', {
          name: 'Route',
          startTime: '12:00',
          endTime: '13:00',
          usage: 'SUBSCRIPTIONS',
        }),
      ).rejects.toThrow(ForbiddenException);

      await service.createDeliverySlot('t1', {
        name: 'Route',
        startTime: '12:00',
        endTime: '13:00',
        usage: 'BOTH',
      });
      expect(mockSettingsRepo.createDeliverySlot).toHaveBeenCalledTimes(1);
    });

    it('refuses to take a slot away from subscriptions while subscribers use it', async () => {
      mockSettingsRepo.findDeliverySlotById.mockResolvedValue({
        ...lunch,
        usage: 'BOTH',
      });
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);
      mockSettingsRepo.findBusinessProfile.mockResolvedValue(null);
      mockFeatures.hasFeature.mockResolvedValue(true);
      mockSettingsRepo.countDeliverySlotUsage.mockResolvedValue({
        subscriptions: 2,
        dayChanges: 0,
        orders: 0,
      });

      await expect(
        service.updateDeliverySlot('t1', 'slot1', { usage: 'ORDERS' }),
      ).rejects.toThrow(/2 active subscriptions/);
      expect(mockSettingsRepo.updateDeliverySlot).not.toHaveBeenCalled();
    });

    it('lets a BOTH slot become subscriptions-only even with upcoming orders', async () => {
      mockSettingsRepo.findDeliverySlotById.mockResolvedValue({
        ...lunch,
        usage: 'BOTH',
      });
      mockSettingsRepo.findDeliverySlotByName.mockResolvedValue(null);
      mockFeatures.hasFeature.mockResolvedValue(true);
      mockSettingsRepo.updateDeliverySlot.mockResolvedValue({});

      await service.updateDeliverySlot('t1', 'slot1', {
        usage: 'SUBSCRIPTIONS',
      });

      expect(mockSettingsRepo.countDeliverySlotUsage).not.toHaveBeenCalled();
      expect(mockSettingsRepo.updateDeliverySlot).toHaveBeenCalledWith(
        'slot1',
        expect.objectContaining({ usage: 'SUBSCRIPTIONS' }),
      );
    });

    it('deletes an unused slot', async () => {
      mockSettingsRepo.findDeliverySlotById.mockResolvedValue(lunch);
      mockSettingsRepo.findBusinessProfile.mockResolvedValue(null);
      mockSettingsRepo.countDeliverySlotUsage.mockResolvedValue({
        subscriptions: 0,
        dayChanges: 0,
        orders: 0,
      });

      await service.deleteDeliverySlot('t1', 'slot1');

      expect(mockSettingsRepo.deleteDeliverySlot).toHaveBeenCalledWith('slot1');
    });
  });

  describe('updateInstantDeliverySettings', () => {
    beforeEach(() => {
      mockSettingsRepo.findInstantDeliverySettings.mockResolvedValue({
        isEnabled: true,
        etaMinMinutes: 20,
        etaMaxMinutes: 35,
      });
      mockSettingsRepo.upsertInstantDeliverySettings.mockImplementation(
        (_t: string, data: Record<string, unknown>) =>
          Promise.resolve({
            isEnabled: true,
            etaMinMinutes: 20,
            etaMaxMinutes: 35,
            ...data,
          }),
      );
    });

    it('rejects min above max, without saving', async () => {
      await expect(
        service.updateInstantDeliverySettings('t1', {
          etaMinMinutes: 50,
          etaMaxMinutes: 20,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(
        mockSettingsRepo.upsertInstantDeliverySettings,
      ).not.toHaveBeenCalled();
    });

    it('checks a one-sided change against the saved other end', async () => {
      // Saved max is 35 — a new min of 40 would invert the range.
      await expect(
        service.updateInstantDeliverySettings('t1', { etaMinMinutes: 40 }),
      ).rejects.toThrow("can't be later than the latest (35 min)");
    });

    it('saves a valid range', async () => {
      await expect(
        service.updateInstantDeliverySettings('t1', {
          etaMinMinutes: 25,
          etaMaxMinutes: 25,
        }),
      ).resolves.toMatchObject({ etaMinMinutes: 25, etaMaxMinutes: 25 });
    });
  });

  describe('updateOrderAcceptance — hours, cutoff and reason', () => {
    const savedData = (): Record<string, unknown> => upsertedData()[0];

    it('rejects hours whose close is not after open, without saving', async () => {
      await expect(
        service.updateOrderAcceptance('t1', {
          operatingHours: { mon: { open: '22:00', close: '02:00' } },
        } as UpdateOrderAcceptanceDto),
      ).rejects.toThrow(BadRequestException);
      expect(
        mockSettingsRepo.upsertOrderAcceptanceSettings,
      ).not.toHaveBeenCalled();
    });

    it('saves valid hours with a closed day', async () => {
      await service.updateOrderAcceptance('t1', {
        operatingHours: { mon: { open: '09:00', close: '21:00' }, sun: {} },
      } as UpdateOrderAcceptanceDto);

      expect(savedData().operatingHours).toEqual({
        mon: { open: '09:00', close: '21:00' },
        sun: {},
      });
    });

    it('clears the cutoff when sent null', async () => {
      await service.updateOrderAcceptance('t1', {
        dailyCutoffTime: null,
      } as UpdateOrderAcceptanceDto);

      expect(savedData().dailyCutoffTime).toBeNull();
    });

    it('stores a blank or null closure reason as null, and trims a real one', async () => {
      await service.updateOrderAcceptance('t1', {
        closureReason: '   ',
      } as UpdateOrderAcceptanceDto);
      await service.updateOrderAcceptance('t1', {
        closureReason: null,
      } as UpdateOrderAcceptanceDto);
      await service.updateOrderAcceptance('t1', {
        closureReason: ' Renovation ',
      } as UpdateOrderAcceptanceDto);

      expect(upsertedData().map((d) => d.closureReason)).toEqual([
        null,
        null,
        'Renovation',
      ]);
    });

    it('leaves the closure reason alone when the DTO omits it', async () => {
      await service.updateOrderAcceptance('t1', {
        isTemporarilyClosed: false,
      } as UpdateOrderAcceptanceDto);

      expect(savedData()).not.toHaveProperty('closureReason');
    });
  });
});
