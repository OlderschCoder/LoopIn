---
name: Clerk sign-in needs a second-factor code step
description: Clerk returns needs_client_trust / needs_second_factor after a correct password, so any custom sign-in UI must implement an emailed one-time code step or sign-in silently dead-ends.
---

A custom (non-Clerk-UI) sign-in screen that only handles `status === "complete"`
will dead-end for **every real user**, because Clerk does not complete sign-in on
an unrecognised device from a password alone.

**What Clerk actually returns after a correct password:**
- `needs_client_trust` — in a real browser/app client. This is the common one: an
  unrecognised device, i.e. every fresh install.
- `needs_second_factor` — seen when driving the Frontend API directly with curl.

Both mean the same thing in practice: *password accepted, now prove it's you.*
Resolve either with the same call pair:

```
signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId? })
signIn.attemptSecondFactor({ strategy: "email_code", code })
```

`emailAddressId` comes from `supportedSecondFactors`; omit it and Clerk falls back
to the primary address. Persist it in state — "resend" must target the same
address, and an OAuth sign-in has no typed email to fall back on.

**Why:** the symptom is a generic "Sign-in incomplete" message with no way
forward, which reads as a broken app rather than a missing UI step. It cost three
rejected builds before the status was actually inspected.

**How to apply:** whenever building a custom Clerk sign-in, treat the
credentials step as stage 1 of 2 and always build the code-entry stage. Route the
OAuth path through the same handler — Google sign-in lands on the second factor
too. Never show a bare "incomplete" message; interpolate the real `status` so the
next failure is diagnosable.

**Testing:** headless/automated sign-in works with a `+clerk_test@example.com`
address, for which the OTP is always `424242`. To probe statuses without a
browser, hit the Frontend API directly — dev instances first require a token from
`POST /v1/dev_browser`, otherwise every call fails `dev_browser_unauthenticated`.
