import { describe, expect, it } from "vitest";

import { claimRotatingTokenNonce } from "../oauthCallback";

describe("claimRotatingTokenNonce", () => {
  it("ignores ordinary launch URLs", () => {
    expect(claimRotatingTokenNonce("loopin://")).toBeNull();
  });

  it("decodes and claims a callback nonce only once", () => {
    const url = "loopin://?rotating_token_nonce=nonce%2Ffor%2Ftest";

    expect(claimRotatingTokenNonce(url)).toBe("nonce/for/test");
    expect(claimRotatingTokenNonce(url)).toBeNull();
  });
});
