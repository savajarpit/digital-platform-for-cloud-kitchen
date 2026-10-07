import { JobRunnerService } from './job-runner.service';
import { RedisService } from '../cache/redis.service';

const mockRedis = {
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};

describe('JobRunnerService', () => {
  let runner: JobRunnerService;

  beforeEach(() => {
    runner = new JobRunnerService(mockRedis as unknown as RedisService);
    const logger = runner['logger'];
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.resetAllMocks());

  it('runs the work under the lock, then releases it', async () => {
    mockRedis.acquireLock.mockResolvedValue('token-1');
    const work = jest.fn().mockResolvedValue({ processed: 3 });

    const result = await runner.run('materialize', 600, work);

    expect(result).toMatchObject({
      status: 'completed',
      summary: { processed: 3 },
    });
    expect(mockRedis.acquireLock).toHaveBeenCalledWith(
      'job-lock:materialize',
      600,
    );
    expect(mockRedis.releaseLock).toHaveBeenCalledWith(
      'job-lock:materialize',
      'token-1',
    );
  });

  it('skips without running when another run holds the lock', async () => {
    mockRedis.acquireLock.mockResolvedValue(null);
    const work = jest.fn();

    const result = await runner.run('materialize', 600, work);

    expect(result.status).toBe('skipped');
    expect(work).not.toHaveBeenCalled();
    expect(mockRedis.releaseLock).not.toHaveBeenCalled();
  });

  it('contains a failure and still releases the lock', async () => {
    mockRedis.acquireLock.mockResolvedValue('token-1');

    const result = await runner.run('materialize', 600, () =>
      Promise.reject(new Error('db down')),
    );

    expect(result.status).toBe('failed');
    expect(mockRedis.releaseLock).toHaveBeenCalledWith(
      'job-lock:materialize',
      'token-1',
    );
  });
});
