/**
 * Tests for GET /api/health — verifies HTTP status codes and response shape
 * for healthy, degraded-never-succeeded, and degraded-after-prior-success states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

// Control getRefreshStatus responses from the health route
vi.mock("../jobs/refreshRatings", () => ({
  getRefreshStatus: vi.fn(),
}));

import { getRefreshStatus } from "../jobs/refreshRatings";
import healthRouter from "../routes/health";

const mockGetStatus = getRefreshStatus as ReturnType<typeof vi.fn>;

// ── Lightweight HTTP test server ─────────────────────────────────────────────

let server: Server;
let baseUrl: string;

beforeEach(
  () =>
    new Promise<void>((resolve) => {
      const app = express();
      app.use("/api", healthRouter);
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
      server.close(() => resolve());
    })
);

// ── Helpers ──────────────────────────────────────────────────────────────────

interface HealthBody {
  status: string;
  ratingsRefresh: {
    lastRunAt: string | null;
    lastSucceededAt: string | null;
    lastRunSucceeded: boolean | null;
    lastError: string | null;
  };
}

async function getHealth() {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = (await res.json()) as HealthBody;
  return { status: res.status, body };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 and status 'ok' when the last refresh succeeded", async () => {
    mockGetStatus.mockReturnValue({
      lastRunAt: new Date("2026-08-03T10:00:00Z"),
      lastSucceededAt: new Date("2026-08-03T10:00:00Z"),
      lastRunSucceeded: true,
      lastError: null,
    });

    const { status, body } = await getHealth();
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.ratingsRefresh.lastRunSucceeded).toBe(true);
    expect(body.ratingsRefresh.lastError).toBeNull();
    expect(body.ratingsRefresh.lastSucceededAt).toBe("2026-08-03T10:00:00.000Z");
  });

  it("returns 200 and status 'ok' when the job has never run yet", async () => {
    mockGetStatus.mockReturnValue({
      lastRunAt: null,
      lastSucceededAt: null,
      lastRunSucceeded: null,
      lastError: null,
    });

    const { status, body } = await getHealth();
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.ratingsRefresh.lastRunSucceeded).toBeNull();
  });

  it("returns 503 and status 'degraded' when the last refresh failed and it has never succeeded", async () => {
    mockGetStatus.mockReturnValue({
      lastRunAt: new Date("2026-08-03T10:00:00Z"),
      lastSucceededAt: null,
      lastRunSucceeded: false,
      lastError: "All configured store fetches failed",
    });

    const { status, body } = await getHealth();
    expect(status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.ratingsRefresh.lastRunSucceeded).toBe(false);
    expect(body.ratingsRefresh.lastError).toMatch(/All configured store fetches failed/);
  });

  it("returns 503 and status 'degraded' when stores fail AFTER a prior successful refresh", async () => {
    // Simulate: ran successfully at 10:00, then failed at 11:00
    mockGetStatus.mockReturnValue({
      lastRunAt: new Date("2026-08-03T11:00:00Z"),
      lastSucceededAt: new Date("2026-08-03T10:00:00Z"),
      lastRunSucceeded: false,
      lastError: "All configured store fetches failed — ratings data may be stale",
    });

    const { status, body } = await getHealth();
    expect(status).toBe(503);
    expect(body.status).toBe("degraded");
    // Prior success timestamp is still present for diagnostic purposes
    expect(body.ratingsRefresh.lastSucceededAt).toBe("2026-08-03T10:00:00.000Z");
    expect(body.ratingsRefresh.lastRunSucceeded).toBe(false);
  });
});
