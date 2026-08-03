---
name: Offline-first per-account data sync
description: How SafeDate AI syncs local-first data to a user's account without leaking data across accounts on a shared device
---

SafeDate AI keeps AsyncStorage as the on-device source of truth but mirrors a JSON blob to the server per Clerk user (GET/PUT /api/user-data, Bearer token via getToken).

Rules this design must keep (learned the hard way in review):

- **Namespace local storage by userId.** Keys are `u:<userId|anon>:<base>`. Global/un-namespaced keys leak one account's data into the next account signed in on the same device.
  **Why:** account switch on a shared device + an empty server record causes the seed-from-local step to upload the previous user's data into the new account.
  **How to apply:** any new persisted key must go through the namespaced `persist`/`removeKey` helpers, and the per-user load effect must reset in-memory state before loading.

- **Guard every async sync result against an account switch.** Capture `myUserId` at effect start and re-check `syncedUserRef.current === myUserId` before applyBlob / setSyncReady / PUT.
  **Why:** a slow pull for user A can resolve after switching to user B and overwrite/cross-write data.

- **Gate pushes behind `syncReady`** (set true only after the initial pull/seed resolves) so stale local never overwrites the server before the first pull.

- **Never sync device-local file URIs** (e.g. audio recordings `uri`). They don't resolve on other devices; syncing them only persists dead paths. Recordings stay in per-user local storage and are excluded from the SyncBlob. True cross-device media would require object-storage upload + remote URLs.

- **One-time legacy adoption:** the first signed-in user inherits any pre-accounts (un-namespaced) local data, then the legacy keys are removed so a second account starts clean.

- **Background tasks (expo-task-manager) run outside React and resolve the owner at write time, so a mutable "active user" key is not enough.** Always-on GPS records to `u:<uid>:locationHistory`/`currentLocation` via a TaskManager task. Store an active *session* `{uid, switchedAt}` (not just uid) and in the task handler discard any sample whose `timestamp < switchedAt`.
  **Why:** a location sample captured under user A can be delivered after A signs out / B signs in; resolving the namespace at write time would write A's point into B's account (cross-account GPS leak).
  **How to apply:** keep `switchedAt` stable while the same uid stays active (don't reset on every effect re-run, or you discard valid samples); serialize transitions — set session before start, stop before clearing session. Mirror storage→state with change-detection (compare length + last timestamp) so the 30s refresh doesn't trigger identical-data PUTs. Cap history (500 pts) in both the task append and the server-merge.
