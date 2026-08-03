---
name: Android release signing via GitHub Actions
description: How signed release APKs are produced for the mobile app, and gotchas hit while setting it up
---

- Keystore + passwords live in `.local/android-signing/` (gitignored): `loopin.keystore`, `loopin.keystore.base64`, `SECRETS.txt`. Alias `loopin`, cert SHA-256 f573e7a2...e153. Losing the keystore means release updates can't be installed over old ones — treat it as irreplaceable.
- The 4 GitHub Actions secrets (ANDROID_KEYSTORE_BASE64/KEY_ALIAS/KEY_PASSWORD/STORE_PASSWORD) are set on the repo; the release path is `workflow_dispatch` with build_type=release.
- **`GITHUB_TOKEN` is shadowed by a Replit system token (348 chars, not a PAT).** A user PAT saved under that name is invisible in the shell. Use a different secret name (`GH_PAT`) and `export GH_TOKEN="$GH_PAT"` for gh CLI.
- **Release JS bundling requires `babel-preset-expo` declared in artifacts/mobile package.json** (pnpm strict node_modules). Debug builds masked this; `:app:createBundleReleaseJsAndAssets` failed with "Cannot find module 'babel-preset-expo'".
- Verify APK signatures with `apksigner verify --print-certs` (via nix-shell -p apksigner), NOT jarsigner — modern APKs use scheme v2/v3 and jarsigner reports "unsigned".
- The CodeExecution sandbox fetch() rejects some header strings (unicode ByteString error) and process.env has no Replit secrets; for GitHub API work use ShellExec, where Replit secrets ARE env vars.
