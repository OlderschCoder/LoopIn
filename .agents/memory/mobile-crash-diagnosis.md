---
name: Diagnosing native-only mobile crashes without a device
description: Why the Expo web preview cannot catch release-APK crashes, and how to make a build report its own startup failure.
---

# You cannot reproduce a native crash from the web preview

The container has no `/dev/kvm`, so no Android emulator, and this app cannot run
in Expo Go. The web preview does **not** exercise Hermes, release minification,
native modules, or the native Clerk SDK path. A change can be green on web and
still crash the APK on launch.

Treat "verified on web" as necessary but not sufficient for anything touching
app startup, auth providers, or native modules.

## Make the build carry its own diagnosis

An uncaught JS error at startup tears the process down with no message: the user
sees the splash logo, then the app quits. That is indistinguishable from a
native crash and invisible in a screenshot — the app destroys the evidence.
When you cannot attach a debugger, the build has to report the reason itself.

**Why:** the scaffold's `ErrorFallback` gates error text behind `__DEV__`, so a
release build shows "Something went wrong" and nothing actionable — even when
the crash *was* caught. Any build going to a tester needs a fallback that
prints the message and stack on screen.

**How to apply:**

- Put the error boundary *above* the auth provider. One nested underneath cannot
  catch a crash in provider setup.
- Hide the splash screen when a fatal is captured, or the error screen renders
  correctly but stays hidden behind it and the symptom looks unchanged.
- If you intercept the global error handler to keep the app alive, scope it
  narrowly: fatal errors only, only during the startup window, and delegate
  everything else to the previous handler. A blanket interceptor suppresses
  normal error reporting for the whole session and can leave a half-broken app
  running instead of failing honestly.
- Accept that pre-module-evaluation and native crashes still escape a JS-level
  fallback. Those need platform crash logs.

## Verify the failure path, not just the happy path

Force the error — throw inside a component under the boundary and screenshot the
result. A diagnostic screen that has never been seen rendering is not a
diagnostic.

Screenshot capture loads a fresh page, so a timeout-triggered screen never
appears if its timer is longer than the capture delay. Temporarily shorten the
timer to ~1ms to observe that path, then restore it.
