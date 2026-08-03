/**
 * Tests for forceRefreshAllStores — verifies it throws when all configured
 * stores fail to return data, and resolves when at least one succeeds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @workspace/db before any import that might trigger its DATABASE_URL check
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [],
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: async () => {},
      }),
    }),
  },
  storeRatingsTable: { store: "store" },
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { forceRefreshAllStores } from "../lib/storeRatings";

// App Store lookup response shape
const makeAppStoreResponse = (rating: number, count: number) => ({
  ok: true,
  json: async () => ({
    resultCount: 1,
    results: [{ averageUserRating: rating, userRatingCount: count }],
  }),
});

// Play Store scraper response shape
const makePlayStoreResponse = (score: number, ratings: number) => ({
  ok: true,
  json: async () => ({ score, ratings }),
});

const failedFetch = () => ({ ok: false });

describe("forceRefreshAllStores", () => {
  const origAppId = process.env.APP_STORE_APP_ID;
  const origPlayId = process.env.GOOGLE_PLAY_APP_ID;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.APP_STORE_APP_ID = origAppId;
    process.env.GOOGLE_PLAY_APP_ID = origPlayId;
  });

  it("resolves without throwing when no store IDs are configured", async () => {
    delete process.env.APP_STORE_APP_ID;
    delete process.env.GOOGLE_PLAY_APP_ID;
    await expect(forceRefreshAllStores()).resolves.toBeUndefined();
  });

  it("throws when the only configured store (App Store) returns null", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    delete process.env.GOOGLE_PLAY_APP_ID;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failedFetch()));
    await expect(forceRefreshAllStores()).rejects.toThrow(
      /All configured store fetches failed/
    );
  });

  it("throws when the only configured store (Play Store) returns null", async () => {
    delete process.env.APP_STORE_APP_ID;
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failedFetch()));
    await expect(forceRefreshAllStores()).rejects.toThrow(
      /All configured store fetches failed/
    );
  });

  it("throws when both configured stores fail", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failedFetch()));
    await expect(forceRefreshAllStores()).rejects.toThrow(
      /All configured store fetches failed/
    );
  });

  it("resolves when the App Store succeeds even if Play Store fails", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";

    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        urls.push(url);
        if (url.includes("itunes")) return makeAppStoreResponse(4.8, 2000);
        return failedFetch(); // Play Store fails
      })
    );

    await expect(forceRefreshAllStores()).resolves.toBeUndefined();
  });

  it("resolves when both stores succeed", async () => {
    process.env.APP_STORE_APP_ID = "123456";
    process.env.GOOGLE_PLAY_APP_ID = "com.example.app";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("itunes")) return makeAppStoreResponse(4.7, 1500);
        return makePlayStoreResponse(4.9, 900);
      })
    );

    await expect(forceRefreshAllStores()).resolves.toBeUndefined();
  });
});
