---
name: Expo CLI authenticates on startup — and takes dev + publish down when the token lapses
description: Why 'expo start' needs an Expo account at all, how a lapsed token breaks both the dev workflow and publishing, and the env-var fix.
---

# `expo start` phones home, and that is a single point of failure

When `app.json` carries `owner`, `extra.eas.projectId`, or `updates.url`, the
Expo CLI authenticates against Expo's API **as it starts**, before Metro binds
its port. If the token it is handed is invalid or expired, the CLI exits with
`ApiV2Error: The bearer token is invalid` and Metro never comes up.

**Why this matters more than it looks:** the token is injected by the platform,
so it does not appear in the project's own env vars or secrets, and it can lapse
without anything in the repo changing. Nothing in the project needs an Expo
account to bundle, so the dependency is invisible until the day it breaks — and
then it breaks *both* the dev workflow and the publish build at once, with two
different-looking symptoms:

- dev workflow: exits immediately, app unreachable in the preview.
- publish: the build script's health-check loop waits for a port that will never
  open, then reports a **timeout** — which reads like a slow build, not an auth
  failure. Look above the timeout in the log for the real error.

## The fix

Set `EXPO_OFFLINE=1` in the environment for any `expo start` the project runs
itself. Offline mode skips the API call and uses anonymous manifest signatures.

Use the **environment variable**, not the `--offline` flag: the flag is mutually
exclusive with `--localhost`, `--host`, `--lan`, and `--tunnel`, and these
invocations generally already pass one of those.

Also drop `EXPO_TOKEN` from the child environment. Nothing to authenticate with
means nothing to expire.

**What this does not affect:** `eas build` and `eas update` are separate commands
that legitimately require credentials, and the installed app's `expo-updates`
runtime still uses its own update URL. Offline mode only silences the CLI.

## Verifying a fix like this

Force the failure rather than trusting the change: run the real build command
with a deliberately bogus token (`EXPO_TOKEN=bogus ... run build`). It should
reproduce the exact production failure before the change and exit 0 after it.
This is the cheapest available proxy for a deploy environment.

## Unrelated trap seen while testing

`pkill -f "expo start"` matches the shell whose own command line contains that
string, so it kills the very command running it — no output, confusing exit.
Kill by port (`lsof -ti:PORT`) or bracket the pattern (`"[e]xpo start"`).
