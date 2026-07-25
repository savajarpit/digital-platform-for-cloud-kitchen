/**
 * Races a promise against a timeout so a slow/unreachable dependency (e.g.
 * Redis-backed Bull queue) can't hang the whole HTTP request. Resolves
 * `undefined` instead of throwing on timeout — callers treat this the same
 * as any other best-effort background-job failure (log and move on).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
