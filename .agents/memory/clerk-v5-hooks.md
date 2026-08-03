---
name: Clerk v5 hook API change
description: In @clerk/expo 3.x (Clerk v5), useSignIn()/useSignUp() lose isLoaded, and useAuth().isSignedIn can go stale after setActive().
---


## Rule 1 — isLoaded missing from useSignIn/useSignUp
Never use `isLoaded` from `useSignIn()` or `useSignUp()` in @clerk/expo 3.x.

**Why:** Clerk v5 removed `isLoaded` from these hooks. It returns `undefined`, which is falsy, so any guard like `if (!isLoaded) return` silently blocks all auth operations. Confirmed by diagnostic screenshot showing `signInLoaded: undefined`, `signUpLoaded: undefined` on device. The same underlying bug also silently breaks `useSSO()` (it internally checks the legacy `isSignInLoaded`/`isSignUpLoaded` and returns `{ createdSessionId: null }` with no error if they're falsy) — don't trust `useSSO()` on this SDK version without independently verifying the OAuth callback completes.

**How to apply:**
- Use `const { isLoaded } = useAuth()` for the Clerk-ready check
- Check `!!signIn` and `!!signUp` to confirm resources are available
- Button disabled state: `disabled={!isLoaded || !signIn || busy}`
- Handler guard: `if (!signIn || !setActive) return`
- Do email/password AND OAuth via `useClerk().client!.signIn` / `.signUp` directly (call `.create()`, then `clerk.setActive({ session })`), not via `useSignIn()`/`useSignUp()`/`useSSO()`.

## Rule 2 — useAuth().isSignedIn can go stale
Don't gate a root-level auth redirect (e.g. an Expo Router `AuthGate` that redirects signed-in users away from `(auth)` screens) on `useAuth().isSignedIn` alone.

**Why:** Observed a real device session (`clerk.session` truthy — confirmed because `signIn.create()` threw Clerk's own "You're already signed in" client-side check) that never triggered the auth-group redirect, i.e. `useAuth().isSignedIn` stayed stale/false while a session actually existed. Same modern-hook desync family as Rule 1.

**How to apply:**
- Subscribe directly to `useClerk().addListener((resources) => ...)` for `signedIn`/`loaded` state in the root auth gate instead of trusting `useAuth()`'s reactive values — `addListener` is the low-level primitive every hook wraps and reliably fires on `setActive`/`signOut`.
- Also worth guarding against stale cached sessions referencing a deleted/invalid Clerk user: on session presence, call `session.getToken()` and `clerk.signOut()` in the catch, so a revoked/deleted-user session doesn't strand the user on a blank or looping screen.
