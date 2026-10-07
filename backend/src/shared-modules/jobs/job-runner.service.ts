import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';

/** What a job reports back: plain counts, logged as one summary line. */
export type JobSummary = Record<string, number>;

export interface JobRunResult {
  status: 'completed' | 'skipped' | 'failed';
  summary?: JobSummary;
  durationMs?: number;
}

/**
 * Runs a scheduled job at most once at a time across every server: a Redis
 * lock (with a TTL as the crash safety net) guards each run, so a second
 * backend instance — or a run that overlaps the previous one — skips
 * instead of doing the work twice. Every run logs a single start/finish
 * line with its counts and duration; a thrown error is logged with its
 * stack and never escapes to crash the scheduler.
 */
@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  constructor(private readonly redis: RedisService) {}

  async run(
    jobName: string,
    lockTtlSeconds: number,
    work: () => Promise<JobSummary>,
  ): Promise<JobRunResult> {
    const lockKey = `job-lock:${jobName}`;
    const token = await this.redis.acquireLock(lockKey, lockTtlSeconds);
    if (!token) {
      this.logger.log(`[${jobName}] skipped — another run holds the lock`);
      return { status: 'skipped' };
    }

    const startedAt = Date.now();
    try {
      const summary = await work();
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `[${jobName}] completed in ${durationMs}ms — ${formatSummary(summary)}`,
      );
      return { status: 'completed', summary, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.error(
        `[${jobName}] failed after ${durationMs}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      return { status: 'failed', durationMs };
    } finally {
      await this.redis.releaseLock(lockKey, token);
    }
  }
}

function formatSummary(summary: JobSummary): string {
  const parts = Object.entries(summary).map(([key, n]) => `${key}=${n}`);
  return parts.length > 0 ? parts.join(' ') : 'nothing to do';
}
