import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import { FeaturesService } from '../features/features.service';
import { UpdateOrderAcceptanceDto } from './dto/update-order-acceptance.dto';

const mockSettingsRepo = {
  findOrderAcceptanceSettings: jest.fn(),
  upsertOrderAcceptanceSettings: jest.fn(),
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

      const [, data] =
        mockSettingsRepo.upsertOrderAcceptanceSettings.mock.calls[0];
      expect(data).not.toHaveProperty('closedDates');
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

    it('needs no feature for orders-only closures', async () => {
      await service.updateOrderAcceptance('t1', {
        closedDates: [{ date: '2026-11-08' }],
      } as UpdateOrderAcceptanceDto);

      expect(mockFeatures.hasFeature).not.toHaveBeenCalled();
    });
  });
});
