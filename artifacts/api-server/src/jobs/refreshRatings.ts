/**
 * Daily background job: refresh App Store / Google Play ratings.
 *
 * Runs once at server startup (to prime the cache) and then every 24 hours.
 * This ensures the landing page always serves a warm cached value and the
 * ratings stay current without needing incoming requests to trigger a refresh.
 *
 * The job is a no-op when neither APP_STORE_APP_ID nor GOOGLE_PLAY_APP_ID is
 * set, so it is safe to run in all environments including local development.
 *
 * Retry strategy
 * ──────────────
 * `forceRefreshAllStores` throws when all configured stores fail.  The
 * scheduler wraps the call in exponential-backoff retry logic: up to
 * MAX_RETRIES additional attempts, with base delay RETRY_BASE_DELAY_MS
 * doubled on each retry.  Only after all retries are exhausted is the failure
 * recorded in the shared status state.
 */

import { forceRefreshAllStores } from "../lib/storeRatings";
import { logger } from "../lib/logger";

const INTERVAL_MS = 24 * 60 * 60 * 1_000; // 24 hours

/** Number of retry attempts after the initial failure. */
export const MAX_RETRIES = 3;
/** Starting delay for the first retry; doubled each subsequent attempt. */
export const RETRY_BASE_DELAY_MS = 60_000; // 1 minute

// ── Shared refresh status (in-memory, reset on restart) ─────────────────────

export interface RefreshStatus {
  /** When the most recent refresh cycle began (null = never run). */
  lastRunAt: Date | null;
  /** When the most recent cycle completed successfully (null = never succeeded). */
  lastSucceededAt: Date | null;
  /** Whether the most recent cycle succeeded. null = job has never run. */
  lastRunSucceeded: boolean | null;
  /** Error message from the most recent failed cycle, if any. */
  lastError: string | null;
}

const status: RefreshStatus = {
  lastRunAt: null,
  lastSucceededAt: null,
  lastRunSucceeded: null,
  lastError: null,
};

/** Returns a snapshot of the most recent refresh cycle outcome. */
export function getRefreshStatus(): Readonly<RefreshStatus> {
  return { ...status };
}

/**
 * Reset the in-memory status to its initial state.
 * For use in tests only — not called by production code.
 */
export function _resetRefreshStatus(): void {
  status.lastRunAt = null;
  status.lastSucceededAt = null;
  status.lastRunSucceeded = null;
  status.lastError = null;
}

// ── Retry helper ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls `fn` up to `maxRetries + 1` times.  On each failure waits
 * `baseDelayMs * 2^attempt` before the next attempt (exponential backoff).
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number,
  label: string
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(
        { attempt, delayMs, label },
        "ratings-refresh: retrying after delay"
      );
      await sleep(delayMs);
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn(
        { err, attempt, maxRetries, label },
        "ratings-refresh: attempt failed"
      );
    }
  }
  throw lastErr;
}

// ── Core job ─────────────────────────────────────────────────────────────────

/**
 * Run one refresh cycle with the given retry parameters.
 * Exported (prefixed `_`) for unit tests — production code uses runRefresh().
 */
export async function _runRefreshOnce(opts?: {
  maxRetries?: number;
  baseDelayMs?: number;
}): Promise<void> {
  const retries = opts?.maxRetries ?? MAX_RETRIES;
  const delay = opts?.baseDelayMs ?? RETRY_BASE_DELAY_MS;

  status.lastRunAt = new Date();
  logger.info("ratings-refresh: starting refresh cycle");

  try {
    await withRetry(
      () => forceRefreshAllStores(),
      retries,
      delay,
      "forceRefreshAllStores"
    );
    status.lastSucceededAt = new Date();
    status.lastRunSucceeded = true;
    status.lastError = null;
    logger.info("ratings-refresh: completed");
  } catch (err) {
    status.lastRunSucceeded = false;
    status.lastError = err instanceof Error ? err.message : String(err);
    // Non-fatal: the /api/social-proof route will lazy-refresh on the next request
    logger.error(
      { err },
      "ratings-refresh: all retries exhausted — serving stale/fallback ratings"
    );
  }
}

async function runRefresh(): Promise<void> {
  return _runRefreshOnce();
}

/**
 * Start the ratings refresh scheduler.
 * Runs an initial fetch immediately, then repeats every INTERVAL_MS.
 * Returns a cleanup function that stops the interval (useful for tests).
 */
export function startRatingsRefreshScheduler(): () => void {
  // Prime the cache at startup (non-blocking)
  runRefresh().catch((err) =>
    logger.error({ err }, "ratings-refresh: startup fetch failed")
  );

  const handle = setInterval(() => {
    runRefresh().catch((err) =>
      logger.error({ err }, "ratings-refresh: interval fetch failed")
    );
  }, INTERVAL_MS);

  // Allow Node to exit even if the interval is still pending
  handle.unref();

  logger.info(
    { intervalHours: INTERVAL_MS / 1_000 / 60 / 60, maxRetries: MAX_RETRIES },
    "ratings-refresh: scheduler started"
  );

  return () => clearInterval(handle);
}
