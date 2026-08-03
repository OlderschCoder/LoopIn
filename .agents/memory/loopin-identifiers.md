---
name: LoopIn app-store identifiers
description: Final bundle ID, slug, and scheme chosen for the LoopIn app; EAS re-link requirement after rename.
---

# LoopIn app-store identifiers

**Rule:** All four app-identity fields in `artifacts/mobile/app.json` now use the LoopIn brand.

| Field | Old value | New value |
|---|---|---|
| `slug` | `safedate-ai` | `loopin` |
| `scheme` | `mobile` | `loopin` |
| `ios.bundleIdentifier` | `com.markbojeun.safedateai` | `com.markbojeun.loopin` |
| `android.package` | `com.markbojeun.safedateai` | `com.markbojeun.loopin` |

**Why:** App was not yet published to either store, so this was the right moment to rename. Changing the package after a store listing exists creates a brand-new listing and loses all reviews/downloads.

**How to apply:**
- The CI Android build (`expo prebuild` + Gradle) picks up the new package automatically from `app.json` — no workflow changes needed.
- EAS is still linked by `extra.eas.projectId` (b1f25b55-2054-4aef-a61b-47a7fbf38710), but the slug mismatch means `eas build` will warn until `eas init --id b1f25b55-...` is re-run inside `artifacts/mobile/`.
- Any deep links or notification payloads that used `mobile://` must be updated to `loopin://`.
