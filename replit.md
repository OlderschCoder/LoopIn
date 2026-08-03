# SafeDate AI

A personal dating safety, coaching, and accountability mobile app — an AI-powered companion that helps users date smarter and safer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `SESSION_SECRET`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) + Expo Router
- API: Express 5 + OpenAI (via Replit AI Integrations)
- Storage: AsyncStorage (device-local, no server DB needed)
- Validation: Zod (`zod/v4`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/(tabs)/` — 5 tab screens: Home, Analyze, Plan, Reflect, Locker
  - `app/coach.tsx` — AI Wingwoman chat (modal)
  - `app/plan/new.tsx` — Multi-step date plan creation wizard (modal)
  - `context/AppContext.tsx` — All app state via AsyncStorage
  - `constants/colors.ts` — Design tokens (violet/rose theme)
- `artifacts/api-server/src/routes/analyze.ts` — AI red-flag analysis endpoint
- `artifacts/api-server/src/routes/coach.ts` — AI Wingwoman coaching endpoint

## Architecture decisions

- Frontend-first: all data stored with AsyncStorage on device. No server database. Privacy by design.
- AI via Replit AI Integrations (no user API key needed): OpenAI gpt-5.4 for analysis and coaching
- The API server exists only for AI calls — the mobile app cannot call OpenAI directly without exposing keys
- `POST /api/analyze` returns structured JSON with riskLevel, greenFlags, yellowFlags, redFlags, recommendations
- `POST /api/coach` returns AI Wingwoman reply from conversation history

## Product

SafeDate AI is a personal dating safety and self-trust companion. Users keep using whatever dating app they already use; SafeDate AI sits beside them as a private coaching layer. Key features:
1. **AI Analysis** — paste chat/profile text, get structured red/yellow/green flag analysis
2. **Date Plans** — multi-step wizard to plan a date with safety scoring
3. **Trusted Circle** — add contacts to notify before dates
4. **AI Wingwoman** — conversational coach for boundaries, message help, and guidance
5. **Post-Date Reflection** — emotional check-in with pattern tracking over time
6. **Evidence Locker** — private, device-only vault for notes, numbers, concerns

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Expo app uses `EXPO_PUBLIC_DOMAIN` env var (set by the dev script) for API base URL
- API routes must be registered in `artifacts/api-server/src/routes/index.ts`
- Only restart the Expo workflow when changing native deps or hitting Metro errors (not for code changes)
- Safety score is calculated client-side in `app/plan/new.tsx` (no server call needed)
- The landing site embeds the live app at `/demo` (iframe in `PhoneMockup.tsx`). It is a static Expo web export in `artifacts/landing/public/demo`. To regenerate: in `artifacts/mobile/app.json` set `experiments.baseUrl: "/demo"` + `reactCompiler: false`, run `expo export --platform web`, copy `dist/` → `landing/public/demo/`, then revert app.json. See memory `expo-web-embed-subpath.md` for the full recipe (Vite dev middleware + `/demo/*` prod rewrite).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
