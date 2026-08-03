/**
 * Unit tests for fetchPlayStoreRating.
 *
 * Mocks google-play-scraper directly to verify that the function correctly
 * maps the scraper response to { rating, reviewCount } and handles every
 * failure mode without throwing.
 *
 * Also covers the AppFollow official path: when APPFOLLOW_API_KEY is set the
 * function must use the AppFollow REST API and only fall back to the scraper
 * when AppFollow returns a non-OK status or malformed JSON.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Must be mocked before any import that transitively loads @workspace/db
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

// Mock google-play-scraper so tests never hit the real Google Play endpoint
vi.mock("google-play-scraper", () => ({
  default: { app: vi.fn() },
}));

import gplay from "google-play-scraper";
import { fetchPlayStoreRating } from "../lib/storeRatings";

const mockApp = gplay.app as ReturnType<typeof vi.fn>;

// ── Scraper (unofficial) path ─────────────────────────────────────────────────

describe("fetchPlayStoreRating — google-play-scraper fallback (no APPFOLLOW_API_KEY)", () => {
  let savedKey: string | undefined;
  let savedSA: string | undefined;

  beforeEach(() => {
    savedKey = process.env.APPFOLLOW_API_KEY;
    savedSA = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    delete process.env.APPFOLLOW_API_KEY;
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    mockApp.mockReset();
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.APPFOLLOW_API_KEY = savedKey;
    else delete process.env.APPFOLLOW_API_KEY;
    if (savedSA !== undefined) process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = savedSA;
    else delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  });

  it("returns { rating, reviewCount } from a normal scraper response", async () => {
    mockApp.mockResolvedValue({ score: 4.65, ratings: 12_500 });

    const result = await fetchPlayStoreRating("com.example.safedate");

    expect(result).toEqual({ rating: 4.7, reviewCount: 12_500 });
  });

  it("passes the package name as appId to gplay.app", async () => {
    mockApp.mockResolvedValue({ score: 4.5, ratings: 1_000 });

    await fetchPlayStoreRating("com.example.myapp");

    expect(mockApp).toHaveBeenCalledOnce();
    expect(mockApp).toHaveBeenCalledWith({ appId: "com.example.myapp" });
  });

  it("rounds the score to one decimal place (4.849 → 4.8)", async () => {
    mockApp.mockResolvedValue({ score: 4.849, ratings: 1_000 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result?.rating).toBe(4.8);
  });

  it("rounds the score to one decimal place (4.75 → 4.8)", async () => {
    mockApp.mockResolvedValue({ score: 4.75, ratings: 1_000 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result?.rating).toBe(4.8);
  });

  it("returns null when score is falsy (null)", async () => {
    mockApp.mockResolvedValue({ score: null, ratings: 500 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toBeNull();
  });

  it("returns null when ratings count is 0 (falsy)", async () => {
    mockApp.mockResolvedValue({ score: 4.5, ratings: 0 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toBeNull();
  });

  it("returns null when the scraper throws (e.g. network error)", async () => {
    mockApp.mockRejectedValue(new Error("socket hang up"));

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toBeNull();
  });

  it("returns null when the scraper throws a non-Error value", async () => {
    mockApp.mockRejectedValue("timeout");

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toBeNull();
  });
});

// ── AppFollow (official) path ─────────────────────────────────────────────────

describe("fetchPlayStoreRating — AppFollow official path (APPFOLLOW_API_KEY set)", () => {
  let savedKey: string | undefined;
  let savedSA: string | undefined;

  beforeEach(() => {
    savedKey = process.env.APPFOLLOW_API_KEY;
    savedSA = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    process.env.APPFOLLOW_API_KEY = "test-appfollow-key";
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    mockApp.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedKey !== undefined) process.env.APPFOLLOW_API_KEY = savedKey;
    else delete process.env.APPFOLLOW_API_KEY;
    if (savedSA !== undefined) process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = savedSA;
    else delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  });

  it("returns AppFollow data when the API responds successfully", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ avg_rating: 4.6, stars: 8_000 }),
    });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toEqual({ rating: 4.6, reviewCount: 8_000 });
    // scraper must NOT be called
    expect(mockApp).not.toHaveBeenCalled();
  });

  it("parses avg_rating as a string (AppFollow sometimes sends strings)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ avg_rating: "4.30", stars: 500 }),
    });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result?.rating).toBe(4.3);
  });

  it("falls back to scraper when AppFollow returns a non-OK status", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    mockApp.mockResolvedValue({ score: 4.9, ratings: 300 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toEqual({ rating: 4.9, reviewCount: 300 });
    expect(mockApp).toHaveBeenCalledOnce();
  });

  it("falls back to scraper when AppFollow returns no usable data", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ avg_rating: null, stars: null }),
    });
    mockApp.mockResolvedValue({ score: 4.2, ratings: 100 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toEqual({ rating: 4.2, reviewCount: 100 });
    expect(mockApp).toHaveBeenCalledOnce();
  });

  it("falls back to scraper when AppFollow fetch throws", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("AppFollow down"));
    mockApp.mockResolvedValue({ score: 4.1, ratings: 200 });

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toEqual({ rating: 4.1, reviewCount: 200 });
    expect(mockApp).toHaveBeenCalledOnce();
  });

  it("returns null when AppFollow fails and scraper also fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 503 });
    mockApp.mockRejectedValue(new Error("Play also down"));

    const result = await fetchPlayStoreRating("com.example.app");

    expect(result).toBeNull();
  });
});
