---
name: GitHub LoopIn repo push setup
description: How this workspace pushes to github.com/OlderschCoder/LoopIn (SSH key, history reset, secret scrubbing)
---

- Remote `origin` = git@github.com:OlderschCoder/LoopIn.git via a dedicated SSH deploy key. Key lives in `.local/ssh/github_loopin` (gitignored); after a Replit restart run `bash .local/ssh/restore-ssh-key.sh` to reinstall it into `~/.ssh`.
- The Replit gitPush/gitPull callbacks were unusable for this repo (stale OAuth to the old SafeDateAI repo); use plain `git push origin main` over SSH instead.
- Git history was re-initialized (single fresh commit, Aug 2026) because the old object store had missing objects from task-agent subrepl remotes and GitHub rejected packs.
- **GitHub push protection blocks any commit containing real keys.** Never let credentials live in `.replit` `[userenv.shared]` — keep Twilio/Telnyx values in Replit Secrets. `.replit` now has empty strings there intentionally.
- CI (`.github/workflows/android.yml`) must pin pnpm to the same major as the lockfile (currently 10.26.1) or `--frozen-lockfile` fails with an "overrides" mismatch.
