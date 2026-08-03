---
name: Play Store screenshot capture
description: How to capture authenticated, populated app screenshots of the Expo web build headlessly (Clerk client-trust bypass, data seeding).
---

Capturing store screenshots of the Clerk-gated Expo app works headlessly against the Expo web dev server (`$REPLIT_EXPO_DEV_DOMAIN`) with `playwright-core` + nix `chromium` (`executablePath` = `which chromium`, `--no-sandbox`).

**Auth:** password sign-in for the test user returns status `needs_client_trust` (not an error — the UI shows "Sign-in incomplete"). Complete it programmatically in-page via `window.Clerk`: `signIn.create({identifier, password})` → `prepareSecondFactor({strategy:'email_code', emailAddressId})` → `attemptSecondFactor({code:'424242'})` (works because the account is a `+clerk_test@example.com` address) → `setActive`. A password can be (re)set via Clerk Backend API `PATCH /v1/users/{id}` with `skip_password_checks`.

**Populated screens:** seed localStorage keys `u:<clerkUserId>:trustedContacts`, `:evidenceItems`, `:activeCheckIn` (activeCheckIn is device-local, never synced) then navigate. Check-in screen hardcodes "GPS not available in web preview" on `Platform.OS === 'web'` — temporarily patch that string for the shot, then revert.

**Why:** sign-up is CAPTCHA-blocked and the standard testing tooling can't write screenshot files to disk; this path is fully scriptable and repeatable.

**How to apply:** any time new/updated store screenshots are needed (phone or tablet — just change the Playwright viewport; keep aspect ratio ≤ 2:1 for Google Play).
