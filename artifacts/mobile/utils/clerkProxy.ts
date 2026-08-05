/**
 * Resolve which Clerk proxy URL (if any) the app should use.
 *
 * Precedence: an explicitly baked-in proxy (EAS builds) > whatever the server
 * reports > a derived fallback. The fallback matters because a server that
 * predates the `clerkProxyUrl` field would otherwise leave a live-key build
 * with no proxy at all — i.e. the blank-screen hang. Live keys are exactly
 * the case that requires the proxy, so deriving it is safe; test keys must
 * keep talking to Clerk directly.
 */

// Path that the API server mounts its Clerk proxy on (CLERK_PROXY_PATH in
// artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts).
export const CLERK_PROXY_PATH = "/api/__clerk";

export function resolveClerkProxyUrl(args: {
  /** EXPO_PUBLIC_CLERK_PROXY_URL baked in at build time, if any. */
  envProxyUrl: string | undefined;
  /** clerkProxyUrl reported by GET /api/auth/config, if any. */
  serverProxyUrl: string | undefined;
  /** The resolved Clerk publishable key (baked-in or fetched). */
  publishableKey: string | undefined;
  /** Base URL of the API server ("" when none is configured). */
  apiBaseUrl: string;
}): string | undefined {
  const { envProxyUrl, serverProxyUrl, publishableKey, apiBaseUrl } = args;

  const derivedProxyUrl =
    publishableKey?.startsWith("pk_live_") && apiBaseUrl
      ? `${apiBaseUrl}${CLERK_PROXY_PATH}`
      : undefined;

  return envProxyUrl ?? serverProxyUrl ?? derivedProxyUrl;
}
