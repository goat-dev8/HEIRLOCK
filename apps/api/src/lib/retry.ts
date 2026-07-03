/**
 * Small retry helper for idempotent reads / transient upstream failures.
 */
export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  retryOn?: (err: unknown) => boolean;
};

export function defaultShouldRetry(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? Number((err as { status: unknown }).status) : NaN;
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|ECONNRESET|ETIMEDOUT|429|rate.?limit/i.test(msg);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const retryOn = opts.retryOn ?? defaultShouldRetry;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !retryOn(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastErr;
}

/** Poll until predicate matches or timeout. */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const intervalMs = opts.intervalMs ?? 500;
  const start = Date.now();
  let last: T | undefined;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`pollUntil timed out after ${timeoutMs}ms`);
}
