/**
 * Tests for GET /api/auth/config — the endpoint release mobile builds call at
 * startup to learn the Clerk publishable key and (in production) the proxy URL.
 *
 * The proxy advertisement rules are the load-bearing part: a production build
 * that doesn't learn about the proxy hangs on a blank screen (the live Clerk
 * instance's own frontend-api host is unreachable), while a dev build that IS
 * told to proxy breaks the other way (proxying doesn't work for dev instances).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

import authRouter from "../routes/auth";

// ── Lightweight HTTP test server ─────────────────────────────────────────────

let server: Server;
let baseUrl: string;

const ENV_KEYS = ["NODE_ENV", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(
  () =>
    new Promise<void>((resolve) => {
      for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
      const app = express();
      app.use("/api", authRouter);
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
      for (const k of ENV_KEYS) {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
      }
      server.close(() => resolve());
    })
);

interface AuthConfigBody {
  clerkPublishableKey?: string;
  clerkProxyUrl?: string;
  error?: string;
}

async function getConfig(headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}/api/auth/config`, { headers });
  const body = (await res.json()) as AuthConfigBody;
  return { status: res.status, body };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/auth/config", () => {
  it("returns 503 when no publishable key is configured", async () => {
    delete process.env.CLERK_PUBLISHABLE_KEY;
    const { status, body } = await getConfig();
    expect(status).toBe(503);
    expect(body.clerkPublishableKey).toBeUndefined();
    expect(body.error).toMatch(/not configured/i);
  });

  it("advertises clerkProxyUrl when NODE_ENV=production and CLERK_SECRET_KEY is set", async () => {
    process.env.NODE_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_live_test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_live_abc";

    const { status, body } = await getConfig({
      "x-forwarded-host": "safe-date-ai-1.replit.app",
      "x-forwarded-proto": "https",
    });
    expect(status).toBe(200);
    expect(body.clerkPublishableKey).toBe("pk_live_abc");
    expect(body.clerkProxyUrl).toBe(
      "https://safe-date-ai-1.replit.app/api/__clerk"
    );
  });

  it("omits clerkProxyUrl when NODE_ENV is not production", async () => {
    process.env.NODE_ENV = "development";
    process.env.CLERK_SECRET_KEY = "sk_test_test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_abc";

    const { status, body } = await getConfig({
      "x-forwarded-host": "example.replit.dev",
    });
    expect(status).toBe(200);
    expect(body.clerkPublishableKey).toBe("pk_test_abc");
    expect(body).not.toHaveProperty("clerkProxyUrl");
  });

  it("omits clerkProxyUrl in production when CLERK_SECRET_KEY is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CLERK_SECRET_KEY;
    process.env.CLERK_PUBLISHABLE_KEY = "pk_live_abc";

    const { body } = await getConfig({
      "x-forwarded-host": "safe-date-ai-1.replit.app",
    });
    expect(body).not.toHaveProperty("clerkProxyUrl");
  });

  it("uses the leftmost x-forwarded-host hop for the proxy URL", async () => {
    process.env.NODE_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_live_test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_live_abc";

    const { body } = await getConfig({
      "x-forwarded-host": "safe-date-ai-1.replit.app, internal-proxy.local",
      "x-forwarded-proto": "https, http",
    });
    expect(body.clerkProxyUrl).toBe(
      "https://safe-date-ai-1.replit.app/api/__clerk"
    );
  });

  it("falls back to the Host header when x-forwarded-host is absent", async () => {
    process.env.NODE_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_live_test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_live_abc";

    const { body } = await getConfig();
    // No x-forwarded-proto either → defaults to https
    expect(body.clerkProxyUrl).toBe(
      `https://${new URL(baseUrl).host}/api/__clerk`
    );
  });
});
