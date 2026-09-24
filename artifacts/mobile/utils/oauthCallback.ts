const consumedNonces = new Set<string>();

/**
 * Android keeps the original launch URL for the life of the process. Claim a
 * Clerk callback nonce once so returning to sign-in after a later sign-out
 * cannot replay an old OAuth callback.
 */
export function claimRotatingTokenNonce(url: string | null): string | null {
  const encodedNonce = url?.match(/[?&]rotating_token_nonce=([^&]+)/)?.[1];
  if (!encodedNonce) return null;

  const nonce = decodeURIComponent(encodedNonce);
  if (consumedNonces.has(nonce)) return null;
  consumedNonces.add(nonce);
  return nonce;
}
