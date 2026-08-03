/**
 * Integration tests for GET /api/social-proof — verifies the stale-data policy:
 * when the scheduler's last refresh cycle failed, the route must serve the
 * static fallback rather than any cached DB values.
 *
 * Strategy: mock only @workspace/db and the low-level fetchers; use the real
 * _runRefreshOnce/_resetRefreshStatus to drive scheduler state so getRefreshStatus
 * is always the real implementation (no live-binding mock issues).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

// Mock DB first — prevent DATABASE_URL check from throwing at import time
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => [] }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }),
  },
  storeRatingsTable: { store: "store" },
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { _resetRefreshStatus, _runRefreshOnce } from "../jobs/refreshRatings";
import { forceRefreshAllStores } from "../lib/storeRatings";
import socialProofRouter from "../routes/socialProof";

// Spy on forceRefreshAllStores directly so we can control whether it throws
const mockForceRefresh = vi.spyOn(
  await import("../lib/storeRatings"),
  "forceRefreshAllStores"
);

// Spy on resolveStore so we can assert it was / was not called
const mockResolveStore = vi.spyOn(
  await import("../lib/storeRatings"),
  "resolveStore"
);

// Spy on getStoreFetchedAt
const mockGetFetchedAt = vi.spyOn(
  await import("../lib/storeRatings"),
  "getStoreFetchedAt"
);

// ── Lightweight HTTP test server ─────────────────────────────────────────────

let server: Server;
let baseUrl: string;

let origAppId: string | undefined;
let origPlayId: string | undefined;

beforeEach(
  () =>
    new Promise<void>((resolve) => {
      origAppId = process.env.APP_STORE_APP_ID;
      origPlayId = process.env.GOOGLE_PLAY_APP_ID;

      // Reset scheduler status so each test starts clean
      _resetRefreshStatus();
      mockForceRefresh.mockReset();
      mockResolveStore.mockReset();
      mockGetFetchedAt.mockReset();

      const app = express();
      app.use("/api", socialProofRouter);
      server = createServer(app);
      server.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    })
);

afterEach(
  () =>
    new Promise<void>((resolve) => {
      process.env.APP_STORE_APP_ID = origAppId;
      process.env.GOOGLE_PLAY_APP_ID = origPlayId;
      server.close(() => resolve());
    })
);

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ProofBody {
  rating: number;
  reviewCount: string;
  source: string;
  cachedAt: string | null;
}

async function getSocialProof() {
  const res = await fetch(`${baseUrl}/api/social-proof`);
  const body = (await res.json()) as ProofBody;
  return { status: res.status, body };
}

/** Put the scheduler into a known "last cycle failed" state with zero delays. */
async function driveRefreshFailure() {
  mockForceRefresh.mockRejectedValue(
    new Error("All configured store fetches failed")
  );
  await _runRefreshOnce({ maxRetries: 0, baseDelayMs: 0 });
}

/** Put the scheduler into a known "last cycle succeeded" state. */
async function driveRefreshSuccess() {
  mockForceRefresh.mockResolvedValue(undefined);
  await _runRefreshOnce({ maxRetries: 0, baseDelayMs: 0 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/social-proof — stale-data policy", () => {
  it("returns static_fallback (not stale cache) when the last refresh cycle failed", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";

    // Drive the scheduler into a failed state (simulates both-stores outage)
    await driveRefreshFailure();

    // Configure resolveStore to return data — it must NOT be called
    mockResolveStore.mockResolvedValue({ rating: 4.7, reviewCount: 99_000 });

    const { status, body } = await getSocialProof();
    expect(status).toBe(200); // route still returns 200; fallback is valid data
    expect(body.source).toBe("static_fallback");
    expect(body.cachedAt).toBeNull();

    // Confirm the DB was NOT consulted — resolveStore bypassed by stale-data policy
    expect(mockResolveStore).not.toHaveBeenCalled();
  });

  it("serves live/cached data when the last refresh succeeded", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    delete process.env.GOOGLE_PLAY_APP_ID;

    await driveRefreshSuccess();

    const cachedDate = new Date("2026-08-03T10:00:00Z");
    mockResolveStore.mockResolvedValue({ rating: 4.7, reviewCount: 3000 });
    mockGetFetchedAt.mockResolvedValue(cachedDate);

    const { status, body } = await getSocialProof();
    expect(status).toBe(200);
    expect(body.source).toBe("app_store");
    expect(body.rating).toBe(4.7);
    expect(body.cachedAt).toBe("2026-08-03T10:00:00.000Z");
    expect(mockResolveStore).toHaveBeenCalledTimes(1);
  });

  it("serves static_fallback (source: static) when no store IDs are configured", async () => {
    delete process.env.APP_STORE_APP_ID;
    delete process.env.GOOGLE_PLAY_APP_ID;

    const { body } = await getSocialProof();
    expect(body.source).toBe("static");
    expect(body.cachedAt).toBeNull();
    expect(mockResolveStore).not.toHaveBeenCalled();
  });

  it("after prior success, a later outage still yields static_fallback", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    delete process.env.GOOGLE_PLAY_APP_ID;

    // Cycle 1: success
    await driveRefreshSuccess();

    // Cycle 2: outage (all retries exhausted)
    await driveRefreshFailure();

    const { body } = await getSocialProof();
    expect(body.source).toBe("static_fallback");
    expect(mockResolveStore).not.toHaveBeenCalled();
  });

  it("blends both store results and exposes oldest cachedAt when both succeed", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";

    await driveRefreshSuccess();

    const appResult = { rating: 4.8, reviewCount: 1000 };
    const playResult = { rating: 4.6, reviewCount: 500 };

    mockResolveStore
      .mockResolvedValueOnce(appResult)
      .mockResolvedValueOnce(playResult);

    const olderDate = new Date("2026-08-02T08:00:00Z");
    const newerDate = new Date("2026-08-03T08:00:00Z");
    mockGetFetchedAt
      .mockResolvedValueOnce(newerDate) // app_store
      .mockResolvedValueOnce(olderDate); // play_store — older, should win

    const { body } = await getSocialProof();
    expect(body.source).toBe("both_stores");
    // cachedAt should be the OLDEST of the two timestamps
    expect(body.cachedAt).toBe("2026-08-02T08:00:00.000Z");
  });
});
