/**
 * Integration test: Play Store data end-to-end through /api/social-proof.
 *
 * Unlike socialProof.test.ts (which spies on resolveStore to test the
 * stale-data policy), this file mocks google-play-scraper at the module
 * boundary and lets the real resolveStore / fetchPlayStoreRating code run
 * so we can verify the full pipeline:
 *
 *   google-play-scraper → fetchPlayStoreRating
 *     → resolveStore (cold DB cache) → upsertCache → /api/social-proof
 *
 * The DB mock returns an empty array on every select (cold cache), so
 * resolveStore always calls the live fetcher, which in turn calls the
 * mocked gplay.app.  This confirms that real Play Store data flows through
 * to the HTTP response when GOOGLE_PLAY_APP_ID is set.
 *
 * APPFOLLOW_API_KEY is explicitly cleared in beforeEach so fetchPlayStoreRating
 * always takes the scraper branch regardless of the host environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

// ── Module mocks (hoisted before any import) ──────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: {
    // Always returns empty rows → getCached returns null → cold cache path
    select: () => ({ from: () => ({ where: async () => [] }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }),
  },
  storeRatingsTable: { store: "store" },
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock the scraper — gplay.app is the single function exercised by fetchPlayStoreRating
vi.mock("google-play-scraper", () => ({
  default: { app: vi.fn() },
}));

import gplay from "google-play-scraper";
import { _resetRefreshStatus } from "../jobs/refreshRatings";
import socialProofRouter from "../routes/socialProof";

const mockGplayApp = gplay.app as ReturnType<typeof vi.fn>;

// ── Response type ─────────────────────────────────────────────────────────────

interface ProofBody {
  rating: number;
  reviewCount: string;
  source: string;
  cachedAt: string | null;
}

// ── HTTP test harness ─────────────────────────────────────────────────────────

let server: Server;
let baseUrl: string;

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use("/api", socialProofRouter);
    server = createServer(app);
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

let savedPlayId: string | undefined;
let savedAppId: string | undefined;
let savedAppFollowKey: string | undefined;
let savedServiceAccount: string | undefined;

beforeEach(async () => {
  savedPlayId = process.env.GOOGLE_PLAY_APP_ID;
  savedAppId = process.env.APP_STORE_APP_ID;
  savedAppFollowKey = process.env.APPFOLLOW_API_KEY;
  savedServiceAccount = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  // Ensure no App Store interference, no AppFollow key, no service-account
  // credentials — scraper path only, no real network calls made
  delete process.env.APP_STORE_APP_ID;
  delete process.env.APPFOLLOW_API_KEY;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  mockGplayApp.mockReset();
  // Scheduler has never run (null) → stale-data policy does NOT block live data
  _resetRefreshStatus();
  await startServer();
});

afterEach(async () => {
  await stopServer();

  if (savedPlayId !== undefined) process.env.GOOGLE_PLAY_APP_ID = savedPlayId;
  else delete process.env.GOOGLE_PLAY_APP_ID;

  if (savedAppId !== undefined) process.env.APP_STORE_APP_ID = savedAppId;
  else delete process.env.APP_STORE_APP_ID;

  if (savedAppFollowKey !== undefined)
    process.env.APPFOLLOW_API_KEY = savedAppFollowKey;
  else delete process.env.APPFOLLOW_API_KEY;

  if (savedServiceAccount !== undefined)
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = savedServiceAccount;
  else delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/social-proof — Play Store data flows end-to-end", () => {
  it("returns play_store source with rating and formatted reviewCount from scraper", async () => {
    process.env.GOOGLE_PLAY_APP_ID = "com.example.safedate";
    mockGplayApp.mockResolvedValue({ score: 4.65, ratings: 12_500 });

    const res = await fetch(`${baseUrl}/api/social-proof`);
    const body = (await res.json()) as ProofBody;

    expect(res.status).toBe(200);
    expect(body.source).toBe("play_store");
    // score 4.65 rounds to 4.7
    expect(body.rating).toBe(4.7);
    // 12_500 is already a multiple of 100 → "12,500+"
    expect(body.reviewCount).toBe("12,500+");
  });

  it("passes the configured GOOGLE_PLAY_APP_ID to the scraper", async () => {
    process.env.GOOGLE_PLAY_APP_ID = "com.example.specificapp";
    mockGplayApp.mockResolvedValue({ score: 4.3, ratings: 500 });

    await fetch(`${baseUrl}/api/social-proof`);

    expect(mockGplayApp).toHaveBeenCalledWith({
      appId: "com.example.specificapp",
    });
  });

  it("returns static_fallback (not a 500) when the scraper throws", async () => {
    process.env.GOOGLE_PLAY_APP_ID = "com.example.safedate";
    mockGplayApp.mockRejectedValue(new Error("Google Play unreachable"));

    const res = await fetch(`${baseUrl}/api/social-proof`);
    const body = (await res.json()) as ProofBody;

    // Route must not 500 — graceful degradation to static fallback
    expect(res.status).toBe(200);
    expect(body.source).toBe("static_fallback");
    expect(typeof body.rating).toBe("number");
    expect(typeof body.reviewCount).toBe("string");
  });

  it("returns static when GOOGLE_PLAY_APP_ID is unset (no IDs configured)", async () => {
    delete process.env.GOOGLE_PLAY_APP_ID;
    delete process.env.APP_STORE_APP_ID;

    const res = await fetch(`${baseUrl}/api/social-proof`);
    const body = (await res.json()) as ProofBody;

    expect(res.status).toBe(200);
    expect(body.source).toBe("static");
    expect(mockGplayApp).not.toHaveBeenCalled();
  });

  it("cachedAt is null (DB mock never stores) but all other fields are present", async () => {
    process.env.GOOGLE_PLAY_APP_ID = "com.example.safedate";
    mockGplayApp.mockResolvedValue({ score: 4.8, ratings: 2_400 });

    const res = await fetch(`${baseUrl}/api/social-proof`);
    const body = (await res.json()) as ProofBody;

    expect(body).toHaveProperty("rating");
    expect(body).toHaveProperty("reviewCount");
    expect(body).toHaveProperty("source");
    expect(body).toHaveProperty("cachedAt");
    // The in-memory DB mock never persists, so getStoreFetchedAt returns null
    expect(body.cachedAt).toBeNull();
  });
});
