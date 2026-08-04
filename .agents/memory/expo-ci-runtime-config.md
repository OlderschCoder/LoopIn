---
name: Expo CI builds and runtime config
description: Why self-hosted CI Expo release builds crash on launch, and the runtime-config pattern that fixes it
---

# EXPO_PUBLIC_* must exist at bundle time, not run time

`EXPO_PUBLIC_*` values are **inlined into the JS bundle** during the release
bundling step. If the CI job doesn't export them for that step, they resolve to
`undefined` in the shipped app — the build still succeeds and the APK installs
fine, so the failure only shows up as an immediate crash-on-launch on a real
device ("keeps stopping"), with no build-time signal at all.

A missing Clerk publishable key is the classic case: `ClerkProvider` throws
during first render, so the app dies before any screen paints.

**Why:** builds moved off EAS to self-hosted GitHub Actions, and only the env
vars someone remembered to add to the workflow survive. EAS had them configured
in its own project env, so nothing complained when the build moved.

**How to apply:** when a CI-built app installs but instantly closes, suspect a
missing `EXPO_PUBLIC_*` before anything else. Grep the workflow's bundling step
env block and compare it against every `process.env.EXPO_PUBLIC_` reference in
the app.

# Fetch environment-varying config from the API at startup

For values that differ between dev and production — Replit-managed Clerk being
the main one, since its `pk_live` key is swapped in automatically at publish and
is never exposed to CI — do not bake the key into the binary. Serve it from a
public API endpoint and fetch it at app startup, falling back to the build-time
env var when present (keeps local dev unchanged).

Publishable keys are safe to serve publicly; they ship in every web bundle
already. Secret keys never are.

**Why:** one binary then works against whichever backend it points at, and the
key can be rotated without rebuilding and redistributing the app.

**How to apply:** the app must render a loading state until the fetch resolves,
and a readable error (not a crash) if it never does. Note the deploy ordering
trap: the server must be **republished with the new route before** the new build
is distributed, or every install fails on a 404.
