import { SubscriptionsMaterializationScheduler } from './subscriptions-materialization.scheduler';

const mockRepo = { findActiveSubscriptionsForMaterialization: jest.fn() };
const mockMaterialization = { materializeOne: jest.fn() };
const mockJobRunner = { run: jest.fn() };

describe('SubscriptionsMaterializationScheduler.materializeAll', () => {
  let scheduler: SubscriptionsMaterializationScheduler;

  beforeEach(() => {
    scheduler = new SubscriptionsMaterializationScheduler(
      mockRepo as never,
      mockMaterialization as never,
      mockJobRunner as never,
    );
    jest
      .spyOn(scheduler['logger'], 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.resetAllMocks());

  it('counts each outcome and keeps going past a failure', async () => {
    mockRepo.findActiveSubscriptionsForMaterialization.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
    ]);
    mockMaterialization.materializeOne
      .mockResolvedValueOnce('processed')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('already-done')
      .mockResolvedValueOnce('processed');

    await expect(scheduler.materializeAll()).resolves.toEqual({
      processed: 2,
      'already-done': 1,
      'not-due': 0,
      expired: 0,
      failed: 1,
    });
    expect(mockMaterialization.materializeOne).toHaveBeenCalledTimes(4);
  });

  it('runs through the job runner under its lock', async () => {
    mockJobRunner.run.mockResolvedValue({ status: 'completed' });

    await scheduler.materializeToday();

    expect(mockJobRunner.run).toHaveBeenCalledWith(
      'subscription-materialization',
      3000,
      expect.any(Function),
    );
  });
});
