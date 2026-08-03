---
name: Embedding an Expo web export at a subpath inside a Vite app
description: How to embed the live Expo (SDK 54, expo-router) app as a static web SPA under /demo of the Vite landing site, and the traps that waste days.
---

# Embedding the Expo app as a live demo under a Vite app's subpath

The landing site (`@workspace/landing`, Vite) embeds the real mobile app in an iframe
at `/demo/`. The app is shipped as a static Expo web export copied into
`artifacts/landing/public/demo`.

## The recipe that works
1. **Export natively with the right base.** Set `experiments.baseUrl` to the subpath
   (e.g. `"/demo"`) in `artifacts/mobile/app.json`, then run
   `pnpm exec expo export --platform web --output-dir dist`. The export bakes the base
   into every asset URL and into expo-router's route parsing/href generation.
2. **Copy `dist/` → `artifacts/landing/public/demo/`** as-is. Do NOT rewrite the bundle.
3. **Add a Vite dev middleware** (`serveDemoStatic` plugin in `landing/vite.config.ts`,
   placed FIRST in the plugins array so it runs before Vite's internals) that serves
   `/demo` and `/demo/*` files directly from `public/demo` with correct MIME and an
   SPA fallback to `public/demo/index.html`.
4. **Production rewrite precedence** in the landing `artifact.toml`: a `/demo/*` →
   `/demo/index.html` rewrite must come BEFORE the global `/*` → `/index.html`, or
   direct full-page loads of `/demo/<route>` get the landing app instead of the demo.

## Why each non-obvious step exists
- **Vite dev refuses URLs containing a literal `/node_modules/` segment** — it falls
  through to the SPA HTML fallback instead of serving the file. Expo asset paths look
  like `/demo/assets/__node_modules/.pnpm/.../node_modules/.../Feather.<hash>.ttf`, so
  every icon font 404s (returns HTML) in dev without the custom middleware. Production
  static serving has no such interception, so the middleware is dev-only.
- **Do NOT manually rewrite the export** (sed `/app`→`/demo`, flatten assets, rewrite
  bundle asset refs). A prior attempt did this and expo-router rendered a styled
  "404 Page Not Found" for every route (including index) even though routes were in the
  bundle — the surgery corrupted routing. A clean re-export with `baseUrl` set is the
  supported path and just works.

## Export gotchas
- **`experiments.reactCompiler: true` makes `expo export` hang.** Set it to `false`
  before exporting. With it false the web export finishes in well under a minute.
- **`baseUrl` is reverted out of `app.json` after export** (along with restoring
  reactCompiler:true) so it doesn't affect native Metro dev. This means future
  re-exports must re-add `experiments.baseUrl` + set reactCompiler:false first. Run a
  long export as a managed workflow (configureWorkflow + poll getWorkflowStatus); a
  plain `bash` call gets killed at the ~2min tool cap and detached procs get reaped.

## Incomplete-export trap (fonts crash the demo)
- **Always verify `dist/assets/` (and `*.ttf`) exist after export before copying to
  `public/demo`.** A previous export shipped only `_expo/`, `index.html`,
  `favicon.ico`, `metadata.json` — no `assets/`. The bundle still requested fonts from
  `/demo/assets/__node_modules/...`; the dev SPA-fallback served `index.html` for them,
  so every font failed with `OTS parsing error: invalid sfntVersion: 1008813135`
  (that number decodes to the ASCII `<!DO` of `<!DOCTYPE html>`). Symptom: all icons
  render as tofu boxes and the app shows Expo Router's "Something went wrong" screen.
  Fix = clean re-export (assets included) and `cp -r dist/. public/demo/`. Sanity check:
  `find public/demo -name '*.ttf' | wc -l` should be ~37, and a curl of one font must
  return `font/ttf`, not `text/html`.

## Debugging trap
- **The `screenshot` tool's "Browser logs" never surface custom `console.log`** — it
  only ever shows Vite client + React DevTools messages. Don't try to debug the embedded
  app via injected console logs read from screenshots; it's a dead end. Use `curl`
  through the proxy (`localhost:80/demo/...`) to check status codes / content-types.
