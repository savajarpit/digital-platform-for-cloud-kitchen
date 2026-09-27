import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { FeaturesRepository } from './features.repository';

const CALENDAR = 'plan-calendar-view';
const SELECTION = 'delivery-date-selection';

const mockRepo = {
  findEnabledForTenant: jest.fn(),
  findFeatureByKey: jest.fn(),
  upsertGrant: jest.fn(),
  findAllFeatures: jest.fn(),
  findAllForTenant: jest.fn(),
};

const featureRow = (key: string) => ({
  id: `id-${key}`,
  key,
  name: key,
  description: '',
});

describe('FeaturesService.setFeature — calendar dependency', () => {
  let service: FeaturesService;

  beforeEach(() => {
    service = new FeaturesService(mockRepo as unknown as FeaturesRepository);
    mockRepo.findFeatureByKey.mockImplementation((key: string) =>
      Promise.resolve(featureRow(key)),
    );
    mockRepo.upsertGrant.mockResolvedValue(undefined);
  });

  afterEach(() => jest.resetAllMocks());

  it('rejects turning on date selection while the calendar is off', async () => {
    mockRepo.findEnabledForTenant.mockResolvedValue([]);

    await expect(
      service.setFeature('t1', SELECTION, true, 'u1'),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepo.upsertGrant).not.toHaveBeenCalled();
  });

  it('allows turning on date selection once the calendar is on', async () => {
    mockRepo.findEnabledForTenant.mockResolvedValue([
      { feature: { key: CALENDAR } },
    ]);

    const result = await service.setFeature('t1', SELECTION, true, 'u1');

    expect(result).toMatchObject({ key: SELECTION, enabled: true });
    expect(mockRepo.upsertGrant).toHaveBeenCalledWith(
      't1',
      `id-${SELECTION}`,
      true,
      'u1',
    );
  });

  it('turning the calendar off also turns date selection off', async () => {
    await service.setFeature('t1', CALENDAR, false, 'u1');

    expect(mockRepo.upsertGrant).toHaveBeenCalledWith(
      't1',
      `id-${CALENDAR}`,
      false,
      'u1',
    );
    expect(mockRepo.upsertGrant).toHaveBeenCalledWith(
      't1',
      `id-${SELECTION}`,
      false,
      'u1',
    );
  });

  it('turning the calendar on does not touch date selection', async () => {
    await service.setFeature('t1', CALENDAR, true, 'u1');

    expect(mockRepo.upsertGrant).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertGrant).toHaveBeenCalledWith(
      't1',
      `id-${CALENDAR}`,
      true,
      'u1',
    );
  });

  it('does not check the dependency for unrelated features', async () => {
    await service.setFeature('t1', 'promotions', true, 'u1');

    expect(mockRepo.findEnabledForTenant).not.toHaveBeenCalled();
    expect(mockRepo.upsertGrant).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException for an unknown feature key', async () => {
    mockRepo.findFeatureByKey.mockResolvedValue(null);

    await expect(service.setFeature('t1', 'nope', true, 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
