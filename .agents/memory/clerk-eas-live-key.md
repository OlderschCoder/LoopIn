---
name: Clerk live-key EAS builds
description: EAS-built mobile apps that talk to a production API server must be built with the production Clerk publishable key, not the dev/test one.
---

# Clerk dev vs. live key mismatch in EAS builds

Replit-managed Clerk auto-swaps `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` from `pk_test_.../sk_test_...` (dev) to `pk_live_.../sk_live_...` (prod) at publish time — dev and prod are **separate Clerk instances** with separate user stores.

**Symptom:** A mobile (Expo/EAS) build whose `EXPO_PUBLIC_API_URL` points at the production server, but whose `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` was baked with the dev `pk_test_...` value, gets an instant `401 Unauthorized` on every authenticated request after a seemingly-successful sign-in. The failure is silent: `getAuth(req)` just returns `{ userId: null, ... }` with no explicit "wrong instance" error — decoding the JWT (without verifying) shows an `iss` claim for the dev Clerk instance while the server's `CLERK_PUBLISHABLE_KEY` is the prod instance, i.e. the token was never going to verify against that server.

**Why:** Each EAS build profile/environment carries its own baked-in env vars (`eas env:list --environment <name>`). It's easy to set `EXPO_PUBLIC_API_URL` to production without also updating the paired Clerk key — they must move together.

**How to apply:** Whenever a build profile's API URL targets production, its `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (in `eas env:list`/`eas env:update`) must be set to the production `pk_live_...` value (get it by temporarily logging `process.env.CLERK_PUBLISHABLE_KEY` server-side and republishing — publishable keys are not sensitive). After fixing the EAS env var, a **new EAS build** is required — existing installed APKs still have the old key baked in and won't self-correct.
