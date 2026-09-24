---
name: Clerk Expo SSO transfer and status reporting
description: Why a Google sign-in in @clerk/expo reports "needs_identifier", and the three rules for handling startSSOFlow's return value correctly.
---

# useSSO() already performs the OAuth→sign-up transfer

`startSSOFlow()` in `@clerk/expo` (Core v3) internally reloads the sign-in with the
`rotating_token_nonce`, checks `signIn.firstFactorVerification.status === "transferable"`,
and awaits `signUp.create({ transfer: true })` before returning. Read the installed
`dist/hooks/useSSO.js` to confirm this rather than trusting Clerk's published docs,
which do not describe the transfer at all.

**Rule 1 — never re-run the transfer on the warm path.** A defensive second
`signUp.create({ transfer: true })` re-POSTs an already-created sign-up. It cannot
recover a success (already returned as a session) or a throw (never returns), and it
can replace or mask a `missing_requirements` state before the code that handles it runs.

**Rule 2 — after a transfer, `signUp` carries the outcome; `signIn` is stale.**
`signIn.status` remains `"needs_identifier"` forever on a transferred attempt, and it is
never null. So `signIn?.status ?? signUp?.status` *always* prints the stale value. That
single `??` ordering is enough to make every OAuth failure surface as a meaningless
`needs_identifier` and send debugging in entirely the wrong direction. Report
`signUp?.status ?? signIn?.status`, and prefer
`signUp.verifications.externalAccount.error` — that is where Clerk puts the real reason
(for example, an email address already belonging to another account). OAuth sign-up
failures arrive there, not as a thrown exception.

**Rule 3 — a cold-start OAuth recovery path must key off the nonce, not a path.**
Android can kill the app while the OAuth browser is open; the callback then relaunches a
fresh process with no `startSSOFlow` promise waiting, so recovery has to run from
`Linking.getInitialURL()`. The SDK's default redirect is
`makeRedirectUri({ path: "sso-callback" })`, but an app passing its own
`makeRedirectUri()` (no path — which is what Clerk's official Expo example shows) never
produces that path. Detecting the callback with `url.includes("sso-callback")` therefore
silently disables the whole recovery. Match on `rotating_token_nonce` instead, and
remember any hand-rolled recovery must replicate the transfer step itself.

**Why:** a production Google sign-in dead-ended on `Google sign-in stopped at
"needs_identifier"`. Both the "Google isn't enabled in prod" and "the transfer is
missing" theories were wrong and cost real time; the provider was enabled and the SDK had
already transferred. The message was simply reporting the wrong resource.

**How to apply:** whenever a Clerk Expo OAuth flow ends somewhere unexpected, print
`signUp.status`, `signUp.missingFields`, and
`signUp.verifications.externalAccount.error` before theorising. Treat a bare
`needs_identifier` as "the error message is lying", not as a diagnosis.
