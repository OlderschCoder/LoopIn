type ClerkSession = { id: string };

type ClerkClient<Session extends ClerkSession> = {
  sessions: ReadonlyArray<Session>;
  reload: () => Promise<unknown>;
};

type WaitForSessionOptions = {
  attempts?: number;
  delay?: (milliseconds: number) => Promise<void>;
};

type SetActive = (params: { session: string }) => Promise<void>;

const defaultDelay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Clerk can return a real createdSessionId before the new session has reached
 * the SDK's in-memory client. Calling setActive with that missing id is treated
 * as setActive({ session: null }), which silently signs the app back out.
 */
export async function waitForClerkSession<Session extends ClerkSession>(
  getClient: () => ClerkClient<Session> | null | undefined,
  sessionId: string,
  { attempts = 3, delay = defaultDelay }: WaitForSessionOptions = {},
): Promise<Session> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const client = getClient();
    if (!client)
      throw new Error("Clerk is not ready to activate this session.");
    const availableSession = client.sessions.find(
      (session) => session.id === sessionId,
    );
    if (availableSession) return availableSession;

    await client.reload();
    const reloadedSession = getClient()?.sessions.find(
      (session) => session.id === sessionId,
    );
    if (reloadedSession) return reloadedSession;

    if (attempt < attempts - 1) {
      await delay(150 * (attempt + 1));
    }
  }

  throw new Error(
    "Google signed you in, but the session is still syncing. Please tap Continue with Google again.",
  );
}

export async function activateClerkSession<Session extends ClerkSession>(
  getClient: () => ClerkClient<Session> | null | undefined,
  sessionId: string,
  setActive: SetActive,
  getActiveSessionId: () => string | null | undefined,
  options?: WaitForSessionOptions,
): Promise<void> {
  await waitForClerkSession(getClient, sessionId, options);
  await setActive({ session: sessionId });
  if (getActiveSessionId() !== sessionId) {
    throw new Error(
      "Google signed you in, but the session could not be activated. Please tap Continue with Google again.",
    );
  }
}
