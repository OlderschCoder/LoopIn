# Deep-link verification checklist (scheme: `loopin://`)

The app's URL scheme was renamed from `mobile` to `loopin` (`app.json` → `"scheme": "loopin"`).
All in-app deep-link code now derives the scheme at runtime via `Linking.createURL(...)`
(expo-linking), so nothing hardcodes `mobile://` anymore. Grep guard:

```bash
rg -n "mobile://" artifacts/mobile artifacts/api-server   # must return no app-code hits
```

## Cold-start verification on a preview build (EAS build, fresh install)

1. Build & install a preview build (`eas build --profile preview`), then **uninstall any
   older build first** so only the new scheme is registered.
2. With the app fully killed, run against the connected device:
   - Android: `adb shell am start -a android.intent.action.VIEW -d "loopin://sso-callback"`
   - iOS simulator: `xcrun simctl openurl booted "loopin://sso-callback"`
3. Confirm the app cold-starts (no "no app can open this link" error).
4. Google sign-in round-trip (uses `loopin://sso-callback`):
   - Sign out, tap "Continue with Google", complete OAuth in the browser tab.
   - The browser must bounce back into the app and the session must activate
     (works on Android via the Linking listener in `app/(auth)/sign-in.tsx`).
5. Negative check: `adb shell am start -a android.intent.action.VIEW -d "mobile://sso-callback"`
   should NOT open the app — old-scheme links are expected to be dead after the rename;
   any external payloads (notifications, SMS, saved links) must use `loopin://`.

## Notes

- Clerk dashboard: allowed redirect URLs must include `loopin://sso-callback`
  (remove the old `mobile://sso-callback` entry once verified).
- Server side (api-server, Twilio webhooks) sends no custom-scheme URLs — verified
  by the grep above — so no backend changes are needed for the rename.
