---
name: GitHub LoopIn repo push setup
description: Durable constraints for pushing this workspace to the GitHub remote.
---

## Rule — credentials must never be committed
Never let real Twilio/Telnyx/Google credential values appear in `.replit` `[userenv.shared]`. Keep them in Replit Secrets only; `.replit` must have empty strings as placeholders.

**Why:** GitHub push protection blocks any commit containing real credential values; the push must be force-amended before it can land.

**How to apply:** Before any commit touching `.replit`, confirm all `[userenv.shared]` values are empty strings (`""`).

## Rule — pnpm version in CI must match the lockfile major
CI workflows that run `pnpm install --frozen-lockfile` must pin pnpm to the same major version as the checked-in lockfile, or the install rejects the lockfile outright.

**Why:** pnpm changed the `overrides` field format between major versions; a mismatched major silently breaks `--frozen-lockfile`.

**How to apply:** When bumping pnpm in CI, update the lockfile at the same time, and vice-versa.
