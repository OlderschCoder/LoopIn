import { describe, expect, it } from "vitest";

import { resolveAuthRedirect } from "../authRouting";

describe("resolveAuthRedirect", () => {
  it("does not redirect while Clerk is still resolving a session", () => {
    expect(
      resolveAuthRedirect({
        isLoaded: false,
        isSignedIn: undefined,
        inAuthGroup: true,
        atRoot: false,
      }),
    ).toBeNull();
  });

  it("sends an authenticated user out of the auth group", () => {
    expect(
      resolveAuthRedirect({
        isLoaded: true,
        isSignedIn: true,
        inAuthGroup: true,
        atRoot: false,
      }),
    ).toBe("/(tabs)");
  });

  it("only sends a definitively signed-out user to sign-in", () => {
    expect(
      resolveAuthRedirect({
        isLoaded: true,
        isSignedIn: false,
        inAuthGroup: false,
        atRoot: false,
      }),
    ).toBe("/(auth)/sign-in");
  });
});
