---
name: Expo web "multiple copies of React" crash
description: Expo web rendering blank with "Invalid hook call / multiple copies of React" traced to a second React version elsewhere in the pnpm monorepo.
---

# Expo web blank screen — duplicate React across the monorepo

**Symptom:** Expo app renders fine natively but the **web** build is blank. Browser console shows
`Invalid hook call ... more than one copy of React` and `TypeError: Cannot read properties of null (reading 'useState')` originating in `expo-router`/`useFonts`.

**Root cause:** A *different* workspace package introduced a second React **major** version into the monorepo (here: `react@18.3.1` was added to `@workspace/scripts` to satisfy `@react-pdf/renderer`). Even though `pnpm why` shows the Expo app's own tree resolving a single React 19, Metro's web bundler still pulled two physical React copies into the web bundle, breaking the hooks dispatcher.

**Fix / rule:** Keep **every** workspace package on the *same* React version. Pin shared deps to `catalog:` (the catalog React is 19.1.0). Don't let any package — even an isolated tooling/scripts package — install a different React major.

**Why:** Metro web bundling does not respect pnpm's isolation as cleanly as native bundling; a stray React major anywhere in the repo can poison the Expo web bundle.

**How to apply:** If Expo web goes blank with hook/duplicate-React errors, run `ls node_modules/.pnpm | grep '^react@'` — if more than one React version appears, find the offending package and align it to `catalog:`, then `pnpm install` and restart the Expo workflow.
