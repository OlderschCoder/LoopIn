---
name: Clerk on Expo — failures that only appear in production
description: Why sign-up and Google sign-in can work in dev and fail on the published app, and what the canonical Expo wiring requires.
---

# Dev tolerates what production rejects

Replit-managed Clerk gives dev and prod **separate instances with different
enforcement**. Several auth bugs are therefore invisible in the preview and only
surface once published — testing on web/dev proves nothing about them.

## Sign-up needs the bot-protection node

Clerk's bot sign-up protection is on by default. The custom sign-up screen must
render `<View nativeID="clerk-captcha" />` for Clerk to mount its challenge into.

**Why:** without it, dev instances let `signUp.create()` through, but production
rejects it. The tell is the error code `captcha_missing_token` — no tester can
create an account on the published app while every dev test passes.

**How to apply:** the node belongs on the screen that actually calls
`signUp.create()` / `signUp.update()`, not on the verification-code screen.

## Don't hand-roll OAuth on Expo — use `useSSO()`

Use `useSSO().startSSOFlow({ strategy, redirectUrl: AuthSession.makeRedirectUri() })`
plus module-level `WebBrowser.maybeCompleteAuthSession()`.

**Why:** hand-rolled flows built on `openAuthSessionAsync` plus a manual
`Linking` listener have to guess when the callback arrived, so they end up with
an arbitrary timeout and a "user must have cancelled" branch. That branch
typically returns without setting an error, so a failed OAuth round trip is
indistinguishable from the user never pressing the button — the screen just sits
there. `startSSOFlow` also understands the production proxy; a hand-rolled
version does not.

**How to apply:** every exit path from an auth handler must set an error. A
silent `return` in auth code is a bug even when the logic is right.

## The prod instance's own Clerk domain is not publicly reachable

The publishable key encodes an FAPI host like `clerk.<app>.replit.app`. It
resolves in public DNS (wildcard) but the connection is closed — nothing serves
it. Only the server-side proxy path works.

**Why:** this is what makes the proxy mandatory in prod rather than an
optimisation, and it means any leg of a flow that runs **in the browser** rather
than through the app's own HTTP client cannot fall back to that host.

**How to apply:** when diagnosing prod auth, check reachability from outside the
container — the workspace resolver maps `*.replit.app` to a private address and
will mislead you. An external fetch service gives the honest answer.

## Diff against canonical before theorising

The clerk-auth skill's `setup-and-customization.md` is the contract. Most
"mysterious" Clerk breakage is drift from it, and reading it first is faster
than reasoning from symptoms.
