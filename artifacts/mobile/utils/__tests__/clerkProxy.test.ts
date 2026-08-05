/**
 * Tests for the Clerk proxy-URL precedence used by useClerkPublishableKey in
 * app/_layout.tsx. Four release builds shipped with sign-in unreachable before
 * this logic existed — a live-key build without a proxy hangs on a blank
 * screen, and a test-key build WITH a proxy breaks the other way.
 */

import { describe, it, expect } from "vitest";

import { resolveClerkProxyUrl, CLERK_PROXY_PATH } from "../clerkProxy";

const API = "https://safe-date-ai-1.replit.app";

describe("resolveClerkProxyUrl", () => {
  it("baked-in EXPO_PUBLIC_CLERK_PROXY_URL wins over everything", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: "https://baked.example.com/api/__clerk",
        serverProxyUrl: "https://server.example.com/api/__clerk",
        publishableKey: "pk_live_abc",
        apiBaseUrl: API,
      })
    ).toBe("https://baked.example.com/api/__clerk");
  });

  it("server-provided clerkProxyUrl wins over the derived fallback", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: "https://server.example.com/api/__clerk",
        publishableKey: "pk_live_abc",
        apiBaseUrl: API,
      })
    ).toBe("https://server.example.com/api/__clerk");
  });

  it("derives ${API_BASE_URL}/api/__clerk for a pk_live_ key when nothing else is set", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: undefined,
        publishableKey: "pk_live_abc",
        apiBaseUrl: API,
      })
    ).toBe(`${API}${CLERK_PROXY_PATH}`);
  });

  it("never derives a proxy for a pk_test_ key", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: undefined,
        publishableKey: "pk_test_abc",
        apiBaseUrl: API,
      })
    ).toBeUndefined();
  });

  it("still honors an explicit server proxy even for a pk_test_ key", () => {
    // The server is the authority on whether its proxy is mounted; the derived
    // fallback is the only place key type gates the decision.
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: "https://server.example.com/api/__clerk",
        publishableKey: "pk_test_abc",
        apiBaseUrl: API,
      })
    ).toBe("https://server.example.com/api/__clerk");
  });

  it("cannot derive a proxy without an API base URL", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: undefined,
        publishableKey: "pk_live_abc",
        apiBaseUrl: "",
      })
    ).toBeUndefined();
  });

  it("returns undefined when the key has not resolved yet", () => {
    expect(
      resolveClerkProxyUrl({
        envProxyUrl: undefined,
        serverProxyUrl: undefined,
        publishableKey: undefined,
        apiBaseUrl: API,
      })
    ).toBeUndefined();
  });
});
