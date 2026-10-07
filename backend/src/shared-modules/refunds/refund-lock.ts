import { ConflictException } from '@nestjs/common';
import type { RedisService } from '../cache/redis.service';

/** Longer than any Razorpay refund call takes; the lock frees itself if the
 * server dies mid-refund. */
const REFUND_LOCK_TTL_SECONDS = 120;

export const REFUND_IN_PROGRESS_MESSAGE =
  'A refund for this is already being processed — refresh in a moment to see it.';

/** Runs one cancel-and-refund for `target` at a time. The Razorpay refund
 * happens before the cancellation is saved, so without this two clicks at
 * once (two tabs, two staff) would each send money back. */
export async function withRefundLock<T>(
  redis: RedisService,
  target: string,
  work: () => Promise<T>,
): Promise<T> {
  const key = `refund-lock:${target}`;
  const token = await redis.acquireLock(key, REFUND_LOCK_TTL_SECONDS);
  if (!token) throw new ConflictException(REFUND_IN_PROGRESS_MESSAGE);
  try {
    return await work();
  } finally {
    await redis.releaseLock(key, token);
  }
}
