---
name: Replit-managed Clerk needs the server proxy in production
description: Why a production mobile build hangs on a blank screen when it talks to Clerk directly, and why a browser test of a live key gives a false negative.
---

# Production Clerk must go through the app server's proxy

A Replit-managed Clerk **production** instance's own frontend-api host
(`clerk.<app-domain>`) does not answer. Live traffic has to be proxied by the
app server (`clerkProxyMiddleware`, mounted at `/api/__clerk`). Development is
the opposite: dev instances talk to Clerk directly and proxying does not work
for them.

**Why:** a client configured with a `pk_live_` key but no `proxyUrl` sends its
bootstrap calls to the dead host. Those requests never resolve, Clerk never
finishes initialising, and `<ClerkLoaded>` renders `null` for as long as that
lasts — which is forever. If the splash screen has already been dismissed
(because the publishable key resolved fine), the user is left on a blank
window with no error and nothing to tap. It reads as a crash, not a config
problem, so it sends you hunting in the wrong place.

**How to apply:**

- Any mobile build carrying a live key must also carry a proxy URL. Builds made
  outside the EAS/`build.js` path are the trap: `build.js` derives
  `EXPO_PUBLIC_CLERK_PROXY_URL` from `CLERK_PROXY_URL`, but a hand-rolled CI
  workflow that only sets `EXPO_PUBLIC_API_URL` silently produces a build with
  no proxy at all. Nothing warns at build time.
- Only advertise a proxy when the middleware is actually mounted (production +
  secret key present). Handing a dev build a proxy URL breaks it the other way.
- Never wrap an app in a readiness gate that can render `null` indefinitely.
  Give every stalled boot a timeout, a message, and a retry.

## Testing a live key from a browser gives a false negative

Clerk's FAPI rejects browser requests whose `Origin` header isn't the
instance's own domain: `origin_invalid` / "Production Keys are only allowed for
domain X". So loading an Expo **web** build against a production key from a dev
domain always fails, even when the configuration is perfect.

React Native sends no `Origin` header, so this check does not apply on device.

To tell a real failure from this false negative, hit the proxied endpoint twice
with curl — once plain, once with an `Origin:` header. Plain returning 200 while
the `Origin` version returns 400 means the config is fine and only the browser
is blocked.
