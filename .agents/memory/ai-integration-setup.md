---
name: SafeDate AI server AI integration
description: How the api-server AI routes (analyze, coach) get their OpenAI access
---

The api-server AI routes (`analyze.ts`, `coach.ts`) talk to OpenAI through the **Replit OpenAI AI integration**, NOT a user-supplied OPENAI_API_KEY.

- Client is `new OpenAI({ baseURL: AI_INTEGRATIONS_OPENAI_BASE_URL, apiKey: AI_INTEGRATIONS_OPENAI_API_KEY })`.
- Model string `gpt-5.4` is the integration's top model — it is valid via the proxy, do NOT "fix" it to gpt-4o thinking it's a typo.
- Those two env vars are provisioned by `setupReplitAIIntegrations({ providerSlug: "openai", ... })` in the code_execution sandbox. If AI requests fail with connection/empty-config errors, the integration likely isn't provisioned — re-run setup.

**Why:** A user-added `OPENAI_API_KEY` existed but its OpenAI account had zero quota (429 insufficient_quota). User chose Replit built-in AI (billed through Replit credits) over topping up their own OpenAI account. The original code was already written for the integration; it just had never been provisioned.
