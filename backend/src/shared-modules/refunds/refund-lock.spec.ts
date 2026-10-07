import { ConflictException } from '@nestjs/common';
import { withRefundLock } from './refund-lock';

const redis = { acquireLock: jest.fn(), releaseLock: jest.fn() };

describe('withRefundLock', () => {
  afterEach(() => jest.resetAllMocks());

  it('runs the refund and always releases the lock', async () => {
    redis.acquireLock.mockResolvedValue('tok');
    const work = jest.fn().mockRejectedValue(new Error('razorpay down'));

    await expect(
      withRefundLock(redis as never, 'subscription:s1', work),
    ).rejects.toThrow('razorpay down');
    expect(redis.acquireLock).toHaveBeenCalledWith(
      'refund-lock:subscription:s1',
      120,
    );
    expect(redis.releaseLock).toHaveBeenCalledWith(
      'refund-lock:subscription:s1',
      'tok',
    );
  });

  it('refuses a second refund while one is running, without calling it', async () => {
    redis.acquireLock.mockResolvedValue(null);
    const work = jest.fn();

    await expect(
      withRefundLock(redis as never, 'order:o1', work),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(work).not.toHaveBeenCalled();
    expect(redis.releaseLock).not.toHaveBeenCalled();
  });
});
