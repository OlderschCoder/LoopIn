/**
 * Tests for the Google service-account JWT path:
 *   - getGoogleBearerToken    (RS256 JWT construction + OAuth2 token exchange)
 *   - probePlayStoreCredentials  (Publisher API connectivity check)
 *   - verifyPlayStoreServiceAccount  (health-check combining token + probe)
 *   - fetchPlayStoreRating    (AppFollow → scraper fallback ordering)
 *
 * A real 2048-bit RSA key is generated once for the suite so JWT signing
 * exercises the actual node:crypto code path and fetch mocks are reached.
 * All network calls are stubbed by URL pattern — no real requests are made.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";

// Mock @workspace/db before anything can trigger its DATABASE_URL guard
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

vi.mock("google-play-scraper", () => ({
  default: { app: vi.fn() },
}));

import gplay from "google-play-scraper";
import {
  getGoogleBearerToken,
  probePlayStoreCredentials,
  verifyPlayStoreServiceAccount,
  fetchPlayStoreRating,
} from "../lib/storeRatings";

// ── Test RSA key (generated once for the whole suite) ─────────────────────────

let TEST_SA_B64: string;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const saJson = JSON.stringify({
    client_email: "test@project.iam.gserviceaccount.com",
    private_key: privateKey,
  });
  TEST_SA_B64 = Buffer.from(saJson).toString("base64");
});

const PACKAGE = "com.example.app";

// ── URL-routed fetch helper ───────────────────────────────────────────────────

function routedFetch(routes: Record<string, () => unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.includes(pattern)) return handler();
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

const tokenOk = () =>
  Promise.resolve({
    ok: true,
    json: async () => ({ access_token: "fake-bearer-token" }),
  });

const tokenFail = () =>
  Promise.resolve({ ok: false, status: 401 });

const probeOk = () =>
  Promise.resolve({ ok: true });

const probeFail = () =>
  Promise.resolve({ ok: false, status: 403 });

const appFollowOk = () =>
  Promise.resolve({
    ok: true,
    json: async () => ({ avg_rating: "4.6", stars: 50000 }),
  });

// ── getGoogleBearerToken ──────────────────────────────────────────────────────

describe("getGoogleBearerToken", () => {
  beforeEach(() => vi.resetAllMocks());

  it("constructs a signed JWT and POSTs it to the Google token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "returned-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const saJson = JSON.parse(Buffer.from(TEST_SA_B64, "base64").toString("utf-8")) as {
      client_email: string;
      private_key: string;
    };
    const token = await getGoogleBearerToken(JSON.stringify(saJson));

    expect(token).toBe("returned-token");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );

    // The body must contain a well-formed three-part JWT assertion
    const body = new URLSearchParams(opts.body as string);
    expect(body.get("grant_type")).toBe(
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    );
    const jwt = body.get("assertion")!;
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);

    // Header must declare RS256
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    expect(header).toMatchObject({ alg: "RS256", typ: "JWT" });

    // Payload must have the correct claims
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(payload.iss).toBe(saJson.client_email);
    expect(payload.scope).toBe("https://www.googleapis.com/auth/androidpublisher");
    expect(payload.aud).toBe("https://oauth2.googleapis.com/token");
    expect(typeof payload.iat).toBe("number");
    expect(payload.exp).toBe(payload.iat + 3600);
  });

  it("returns null when the token endpoint responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const saJson = JSON.parse(Buffer.from(TEST_SA_B64, "base64").toString("utf-8"));
    expect(await getGoogleBearerToken(JSON.stringify(saJson))).toBeNull();
  });

  it("returns null when the service-account JSON is malformed", async () => {
    expect(await getGoogleBearerToken("not-json")).toBeNull();
  });

  it("returns null when required fields are missing", async () => {
    expect(await getGoogleBearerToken(JSON.stringify({ client_email: "" }))).toBeNull();
  });
});

// ── probePlayStoreCredentials ─────────────────────────────────────────────────

describe("probePlayStoreCredentials", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns true and requests reviews?maxResults=1 with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await probePlayStoreCredentials(PACKAGE, "my-token")).toBe(true);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`${PACKAGE}/reviews?maxResults=1`);
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-token"
    );
  });

  it("returns false on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect(await probePlayStoreCredentials(PACKAGE, "bad-token")).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    expect(await probePlayStoreCredentials(PACKAGE, "token")).toBe(false);
  });
});

// ── verifyPlayStoreServiceAccount ────────────────────────────────────────────

describe("verifyPlayStoreServiceAccount", () => {
  const origSA = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  beforeEach(() => vi.resetAllMocks());
  afterEach(() => {
    if (origSA === undefined) delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = origSA;
  });

  it("returns false and skips network calls when env var is absent", async () => {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyPlayStoreServiceAccount(PACKAGE)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns true when token exchange and probe both succeed", async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = TEST_SA_B64;
    vi.stubGlobal(
      "fetch",
      routedFetch({
        "oauth2.googleapis.com": tokenOk,
        "androidpublisher.googleapis.com": probeOk,
      })
    );

    expect(await verifyPlayStoreServiceAccount(PACKAGE)).toBe(true);
  });

  it("returns false when token exchange fails", async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = TEST_SA_B64;
    vi.stubGlobal(
      "fetch",
      routedFetch({ "oauth2.googleapis.com": tokenFail })
    );

    expect(await verifyPlayStoreServiceAccount(PACKAGE)).toBe(false);
  });

  it("returns false when probe returns non-OK", async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = TEST_SA_B64;
    vi.stubGlobal(
      "fetch",
      routedFetch({
        "oauth2.googleapis.com": tokenOk,
        "androidpublisher.googleapis.com": probeFail,
      })
    );

    expect(await verifyPlayStoreServiceAccount(PACKAGE)).toBe(false);
  });
});

// ── fetchPlayStoreRating — fallback ordering ──────────────────────────────────

describe("fetchPlayStoreRating — AppFollow → scraper ordering", () => {
  const origAF = process.env.APPFOLLOW_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.APPFOLLOW_API_KEY;
  });
  afterEach(() => {
    if (origAF === undefined) delete process.env.APPFOLLOW_API_KEY;
    else process.env.APPFOLLOW_API_KEY = origAF;
  });

  it("returns AppFollow data when APPFOLLOW_API_KEY is set", async () => {
    process.env.APPFOLLOW_API_KEY = "af-key";
    vi.stubGlobal(
      "fetch",
      routedFetch({ "appfollow.io": appFollowOk })
    );

    expect(await fetchPlayStoreRating(PACKAGE)).toEqual({
      rating: 4.6,
      reviewCount: 50000,
    });
    // Scraper should not be called
    expect(vi.mocked(gplay.app)).not.toHaveBeenCalled();
  });

  it("falls back to scraper when AppFollow is absent", async () => {
    vi.mocked(gplay.app).mockResolvedValue({ score: 4.3, ratings: 12000 } as never);

    expect(await fetchPlayStoreRating(PACKAGE)).toEqual({
      rating: 4.3,
      reviewCount: 12000,
    });
  });

  it("falls back to scraper when AppFollow returns non-OK", async () => {
    process.env.APPFOLLOW_API_KEY = "af-key";
    vi.stubGlobal(
      "fetch",
      routedFetch({
        "appfollow.io": () => Promise.resolve({ ok: false, status: 500 }),
      })
    );
    vi.mocked(gplay.app).mockResolvedValue({ score: 4.1, ratings: 5000 } as never);

    expect(await fetchPlayStoreRating(PACKAGE)).toEqual({
      rating: 4.1,
      reviewCount: 5000,
    });
  });

  it("returns null when both AppFollow and scraper fail", async () => {
    process.env.APPFOLLOW_API_KEY = "af-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );
    vi.mocked(gplay.app).mockRejectedValue(new Error("scraper error"));

    expect(await fetchPlayStoreRating(PACKAGE)).toBeNull();
  });

  it("does NOT call the OAuth2 token endpoint during a rating fetch", async () => {
    // fetchPlayStoreRating uses AppFollow/scraper for ratings — credential
    // checks belong in verifyPlayStoreServiceAccount (called at startup only).
    // Even with GOOGLE_PLAY_SERVICE_ACCOUNT_JSON set, no OAuth2 call is made.
    const origSA = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = TEST_SA_B64;
    try {
      const fetchMock = routedFetch({ "appfollow.io": appFollowOk });
      vi.stubGlobal("fetch", fetchMock);
      process.env.APPFOLLOW_API_KEY = "af-key";

      await fetchPlayStoreRating(PACKAGE);

      const calledUrls = (fetchMock.mock.calls as [string][]).map(([u]) => u);
      expect(calledUrls.every((u) => !u.includes("oauth2.googleapis.com"))).toBe(true);
    } finally {
      if (origSA === undefined) delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
      else process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = origSA;
    }
  });
});
