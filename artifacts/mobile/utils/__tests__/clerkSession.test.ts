import { describe, expect, it, vi } from "vitest";

import { activateClerkSession, waitForClerkSession } from "../clerkSession";

describe("waitForClerkSession", () => {
  it("does not reload when the created session is already available", async () => {
    const client = {
      sessions: [{ id: "sess_ready" }],
      reload: vi.fn(),
    };

    await waitForClerkSession(() => client, "sess_ready");

    expect(client.reload).not.toHaveBeenCalled();
  });

  it("reloads a stale client before the caller activates the session", async () => {
    const client = {
      sessions: [] as Array<{ id: string }>,
      reload: vi.fn(async () => {
        client.sessions = [{ id: "sess_new" }];
      }),
    };

    let activeSessionId: string | undefined;
    const setActive = vi.fn(async ({ session }: { session: string }) => {
      activeSessionId = session;
    });
    await activateClerkSession(
      () => client,
      "sess_new",
      setActive,
      () => activeSessionId,
    );

    expect(client.reload).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledWith({ session: "sess_new" });
  });

  it("fails visibly instead of silently activating a missing session", async () => {
    const client = {
      sessions: [] as Array<{ id: string }>,
      reload: vi.fn(async () => undefined),
    };

    const setActive = vi.fn(async () => undefined);
    await expect(
      activateClerkSession(
        () => client,
        "sess_missing",
        setActive,
        () => undefined,
        {
          attempts: 2,
          delay: async () => undefined,
        },
      ),
    ).rejects.toThrow("session is still syncing");
    expect(client.reload).toHaveBeenCalledTimes(2);
    expect(setActive).not.toHaveBeenCalled();
  });

  it("fails visibly when Clerk returns without activating the session", async () => {
    const client = {
      sessions: [{ id: "sess_new" }],
      reload: vi.fn(),
    };
    const setActive = vi.fn(async () => undefined);

    await expect(
      activateClerkSession(
        () => client,
        "sess_new",
        setActive,
        () => null,
      ),
    ).rejects.toThrow("session could not be activated");
  });
});
