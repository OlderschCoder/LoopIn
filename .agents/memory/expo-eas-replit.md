---
name: Expo EAS builds on Replit
description: Distributing an Expo (SDK 54) app from a Replit repl — Expo Go limits, EAS Build quirks, and dependency pinning.
---

# Distributing an Expo app from Replit

## Expo Go is not a viable target for apps using push notifications
**Rule:** Apps that import `expo-notifications` for remote push cannot run in Expo Go on SDK 53+ — Expo removed remote-push support from the Expo Go app. It throws at runtime ("Use a development build instead of Expo Go").
**Why:** SafeDate AI relies on push for date check-in/safety alerts, so a "scan-in-Expo-Go" share link is impossible for it.
**How to apply:** For such apps, the share path is an EAS Build (development build for devs, internal-distribution / TestFlight preview build for non-technical testers), not Expo Go. EAS Update can then deliver OTA JS to those builds.

## EAS Update with a `runtimeVersion` field cannot load in Expo Go
**Why:** `eas update:configure` adds `runtimeVersion` (policy `appVersion`) + `updates.url` to app.json; updates carrying a runtimeVersion are blocked from Expo Go entirely (only a fragile "simulation" otherwise). These fields are harmless for Metro/dev-server runs and useful for builds, so keep them.

## Running `eas build` from the Replit main agent
**Rule:** Prefix with `EAS_NO_VCS=1` (and optionally `EAS_SKIP_AUTO_FINGERPRINT=1`).
**Why:** EAS CLI shells out to git to archive the project; the sandbox blocks destructive git ops and a stale `.git/index.lock` makes the build abort. `EAS_NO_VCS=1` makes it archive the working dir directly.
**How to apply:** `EAS_NO_VCS=1 EXPO_TOKEN=... npx --yes eas-cli@latest build --platform android --profile preview --non-interactive --no-wait`. Android keystore is auto-generated server-side; iOS needs Apple creds.

## Never install expo-* packages with the raw package manager
**Rule:** Use `npx expo install <pkg>` / `npx expo install --fix`, never `pnpm add expo-notifications`.
**Why:** A plain add grabbed `expo-notifications@^56.0.13` (a wrong major) instead of the SDK-54 line `~0.32.x`; the Metro "expected version" warning is the signal. Wrong native module versions fail the EAS build.
**How to apply:** After any expo dep change, check the Metro startup "packages should be updated" warning and align to the expected versions, then `pnpm install` to sync the lockfile and restart the mobile workflow.

## Android EAS build fails at `mergeReleaseJavaResource` (duplicate META-INF)
**Symptom:** Build compiles fully then errors at `:app:mergeReleaseJavaResource` — "N files found with path 'META-INF/...'" from two transitive jars (seen: okhttp `logging-interceptor` vs `jspecify` both shipping `META-INF/versions/9/OSGI-INF/MANIFEST.MF`).
**Why:** Android's resource merger refuses to pick between identical packaged files from different deps; the failure is on the FIRST conflict, so more may surface one at a time.
**How to apply:** Add the `expo-build-properties` config plugin (install via `npx expo install expo-build-properties`) with `android.packagingOptions.exclude` (or `pickFirst`) listing the conflicting path, e.g. `"exclude": ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"]`. These META-INF manifests are unused at runtime, so exclude is safe. Rebuild after.
**Reading EAS build logs:** `build:view <id>` hangs (interactive). Use `build:list --platform android --limit 1 --json --non-interactive`, grab the signed `logFiles` URL, then `curl -s --compressed <url>` (logs are brotli NDJSON; without `--compressed` you get a corrupt/truncated brotli blob). Grep msg fields for `What went wrong` / `Execution failed for`.

## Auth / token
The mobile workflow runs Metro without `EXPO_TOKEN`; an *invalid* EXPO_TOKEN env value breaks `expo start` with "bearer token is invalid", so keep the secret unset unless it holds a valid token. EAS CLI commands authenticate via an inline/valid `EXPO_TOKEN`.
