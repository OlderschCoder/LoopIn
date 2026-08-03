---
name: Twilio private-number feature
description: Per-user VoIP/proxy number (text + masked recorded calls) — non-obvious constraints in the SafeDate AI build.
---

# Per-user Twilio private number (texting + masked, recorded calling)

Each user gets a Twilio number to text/call dating-app matches while hiding her real number; every text + call is captured to her vault. Calls play a two-party-consent "this call may be recorded" notice before bridging.

## Hard constraints / why
- **Webhook signature validation is impossible.** The Replit Twilio connector proxy hides the auth token, so `X-Twilio-Signature` can't be verified. We gate every public webhook on a shared secret query token (`?k=`). **Why:** without it, webhook routes are unauthenticated. Never assume Twilio sig validation is available behind the connector proxy.
- **One Twilio number must map to exactly one user, enforced in the DB.** `phone_numbers.phone_number` AND `phone_numbers.twilio_sid` are unique indexes; setup claims via insert + `onConflictDoNothing().returning()` and treats 0 rows as "taken concurrently". **Why:** webhooks resolve the owning user by the destination number — a read-then-insert race or duplicate row would attribute one user's inbound texts/calls to another (cross-user leak). Webhook owner lookup also refuses attribution if a number ever resolves to >1 owner.
- **Masked outbound call = two legs.** Twilio first calls the owner's real phone (`owner_real_phone`, stored server-side only, never in client state), then on answer the voice-outbound TwiML `<Dial callerId=privateNumber record=record-from-answer-dual>` bridges to the match. The match sees the private number, not the real one.

## Trial-account caveats (must surface, never silent-fallback)
- A Twilio **trial** account has ONE number (toll-free, not area-code-local) and can only message **verified** numbers. Per-user *local* area-code numbers + reliable toll-free SMS need a PAID/verified account. Setup returns a 409 explaining this when no number is free.

## Mobile gotcha
- A hook that returns an object of API callbacks must be `useMemo`'d (depending on the memoized `authed`/`getToken`). **Why:** screens call these inside `useFocusEffect`/`useEffect`; a fresh object each render changes callback identity and re-triggers loads in a loop.
