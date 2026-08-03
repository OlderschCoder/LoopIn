/**
 * Tests for the ratings refresh scheduler — verifies retry count, status
 * tracking, and correct degraded state after prior success.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocked before importing the scheduler so the scheduler uses these mocks
vi.mock("../lib/storeRatings", () => ({
  forceRefreshAllStores: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { _runRefreshOnce, _resetRefreshStatus, getRefreshStatus } from "../jobs/refreshRatings";
import { forceRefreshAllStores } from "../lib/storeRatings";

const mockRefresh = forceRefreshAllStores as ReturnType<typeof vi.fn>;

/** Run a cycle with zero delays for fast tests. */
const runFast = (maxRetries = 2) =>
  _runRefreshOnce({ maxRetries, baseDelayMs: 0 });

describe("_runRefreshOnce — status tracking", () => {
  beforeEach(() => {
    _resetRefreshStatus();
    mockRefresh.mockReset();
  });

  it("sets lastRunSucceeded: true when refresh succeeds on first attempt", async () => {
    mockRefresh.mockResolvedValue(undefined);
    await runFast();
    const s = getRefreshStatus();
    expect(s.lastRunSucceeded).toBe(true);
    expect(s.lastSucceededAt).toBeInstanceOf(Date);
    expect(s.lastError).toBeNull();
  });

  it("sets lastRunSucceeded: false and records error after all retries exhausted", async () => {
    mockRefresh.mockRejectedValue(new Error("Both stores failed"));
    await runFast(2); // 1 initial + 2 retries = 3 total calls
    const s = getRefreshStatus();
    expect(s.lastRunSucceeded).toBe(false);
    expect(s.lastError).toMatch(/Both stores failed/);
    expect(s.lastSucceededAt).toBeNull();
  });

  it("sets lastRunSucceeded: false after prior success when stores later fail", async () => {
    // First cycle succeeds
    mockRefresh.mockResolvedValueOnce(undefined);
    await runFast();
    expect(getRefreshStatus().lastRunSucceeded).toBe(true);
    const firstSucceededAt = getRefreshStatus().lastSucceededAt;

    // Second cycle: all retries exhausted
    mockRefresh.mockRejectedValue(new Error("Stores went down"));
    await runFast(1);

    const s = getRefreshStatus();
    expect(s.lastRunSucceeded).toBe(false);
    expect(s.lastError).toMatch(/Stores went down/);
    // Prior success timestamp is preserved for diagnostic purposes
    expect(s.lastSucceededAt).toEqual(firstSucceededAt);
  });
});

describe("_runRefreshOnce — retry count", () => {
  beforeEach(() => {
    _resetRefreshStatus();
    mockRefresh.mockReset();
  });

  it("calls forceRefreshAllStores exactly once when first attempt succeeds", async () => {
    mockRefresh.mockResolvedValue(undefined);
    await runFast(3);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxRetries+1 times on persistent failure", async () => {
    const maxRetries = 2;
    mockRefresh.mockRejectedValue(new Error("store down"));
    await runFast(maxRetries);
    // 1 initial attempt + 2 retries
    expect(mockRefresh).toHaveBeenCalledTimes(maxRetries + 1);
  });

  it("stops retrying as soon as an attempt succeeds", async () => {
    // Fail twice then succeed
    mockRefresh
      .mockRejectedValueOnce(new Error("store down"))
      .mockRejectedValueOnce(new Error("store down"))
      .mockResolvedValue(undefined);

    await runFast(5); // allow up to 5 retries, but should stop at 3rd call
    expect(mockRefresh).toHaveBeenCalledTimes(3);
    expect(getRefreshStatus().lastRunSucceeded).toBe(true);
  });
});
