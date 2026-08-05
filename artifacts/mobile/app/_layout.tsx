import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { reloadAppAsync } from "expo";
import { ClerkProvider, ClerkLoaded, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();
import { resolveClerkProxyUrl } from "@/utils/clerkProxy";
import * as Network from "expo-network";

const envPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || undefined;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Base URL of the API server (same convention as hooks/usePhone.ts).
const _rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");
const API_BASE_URL = _rawApiUrl.replace(/\/$/, "");

// ── Startup crash capture ────────────────────────────────────────────────────
// An uncaught JS error during startup tears the app down with no message: the
// user sees the logo, then the app quits. That is indistinguishable from a
// native crash and impossible to diagnose remotely. Capture the error, keep the
// process alive, and put the reason on screen where it can be read.
type FatalInfo = { message: string; stack: string };

let capturedFatal: FatalInfo | null = null;
const fatalSubscribers = new Set<(fatal: FatalInfo) => void>();

function reportFatal(error: unknown): void {
  if (capturedFatal) return; // keep the first, most relevant failure
  const err = error as { name?: string; message?: string; stack?: string };
  capturedFatal = {
    message: `${err?.name ?? "Error"}: ${err?.message ?? String(error)}`,
    stack: (err?.stack ?? "").split("\n").slice(0, 12).join("\n"),
  };
  fatalSubscribers.forEach((notify) => notify(capturedFatal!));
}

// Only fatal errors, and only while starting up, are intercepted. Swallowing
// everything for the whole session would suppress ordinary error reporting and
// could leave a half-broken app running instead of failing honestly.
let startupDiagnosticsActive = true;

function endStartupDiagnostics(): void {
  startupDiagnosticsActive = false;
}

{
  const errorUtils = (globalThis as { ErrorUtils?: any }).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      if (isFatal && startupDiagnosticsActive) {
        // Deliberately not delegating: the default handler tears the app down,
        // which is exactly the silent quit being replaced with a message.
        reportFatal(error);
        return;
      }
      defaultHandler?.(error, isFatal);
    });
  }
}

function useFatalError(): FatalInfo | null {
  const [fatal, setFatal] = React.useState<FatalInfo | null>(capturedFatal);
  useEffect(() => {
    if (capturedFatal) setFatal(capturedFatal);
    const notify = (f: FatalInfo) => setFatal(f);
    fatalSubscribers.add(notify);
    return () => {
      fatalSubscribers.delete(notify);
    };
  }, []);
  return fatal;
}

// Path that the API server mounts its Clerk proxy on (CLERK_PROXY_PATH in
// artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts).
/**
 * Resolve the Clerk publishable key *and* the Clerk proxy URL. Release builds
 * made in CI don't bake either in; instead they fetch them from the API server
 * at startup so the correct values (pk_test + direct in dev, pk_live + proxy in
 * production) are always used.
 *
 * The proxy is not optional in production: a live instance's own frontend-api
 * host is unreachable, so a client configured without `proxyUrl` never finishes
 * loading and the app sits on a blank screen forever.
 */
function useClerkPublishableKey(): {
  publishableKey: string | undefined;
  proxyUrl: string | undefined;
  keyError: string | null;
  retryKeyFetch: () => void;
} {
  const [fetchedKey, setFetchedKey] = React.useState<string | undefined>();
  const [fetchedProxyUrl, setFetchedProxyUrl] = React.useState<
    string | undefined
  >();
  const [keyError, setKeyError] = React.useState<string | null>(null);
  // Bumping this re-runs the fetch, so a user who was offline can recover
  // without force-quitting and reopening the app.
  const [retryCount, setRetryCount] = React.useState(0);

  const retryKeyFetch = React.useCallback(() => {
    setKeyError(null);
    setRetryCount((n) => n + 1);
  }, []);

  useEffect(() => {
    if (envPublishableKey) return;

    // No API URL baked in means there is nowhere to fetch the key from. Surface
    // it immediately rather than sitting on the splash screen forever.
    if (!API_BASE_URL) {
      setKeyError(
        "This build is missing its server address, so it can't sign you in. Please reinstall the latest version.",
      );
      return;
    }

    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        // A stalled network request never rejects on its own, so bound it.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/config`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as {
            clerkPublishableKey?: string;
            clerkProxyUrl?: string;
          };
          if (!data.clerkPublishableKey) throw new Error("No key in response");
          if (!cancelled) {
            setFetchedKey(data.clerkPublishableKey);
            setFetchedProxyUrl(data.clerkProxyUrl);
          }
          return;
        } catch {
          if (cancelled) return;
          if (attempt === 2) {
            setKeyError(
              "Could not reach the server. Check your internet connection, then tap Try again.",
            );
            return;
          }
          await new Promise((r) => setTimeout(r, 1500));
        } finally {
          clearTimeout(timeoutId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const publishableKey = envPublishableKey ?? fetchedKey;

  return {
    publishableKey,
    // Precedence lives in resolveClerkProxyUrl (unit-tested): baked-in env
    // proxy > server-reported proxy > derived /api/__clerk fallback for
    // pk_live_ keys only.
    proxyUrl: resolveClerkProxyUrl({
      envProxyUrl: proxyUrl,
      serverProxyUrl: fetchedProxyUrl,
      publishableKey,
      apiBaseUrl: API_BASE_URL,
    }),
    keyError,
    retryKeyFetch,
  };
}

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const queryClient = new QueryClient();

// ── Fake-call countdown watcher ──────────────────────────────────────────────
function FakeCallWatcher() {
  const { fakeCall } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!fakeCall) return;
    const delay = new Date(fakeCall.triggerAt).getTime() - Date.now();
    if (delay <= 0) {
      router.push("/fake-call");
      return;
    }
    const id = setTimeout(() => router.push("/fake-call"), delay);
    return () => clearTimeout(id);
  }, [fakeCall, router]);

  return null;
}

// ── Date Night auto-activation watcher ───────────────────────────────────────
function DateNightWatcher() {
  const { datePlans, settings, trustedContacts, setActiveCheckIn } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!settings.dateNightPin) return;

    const upcoming = datePlans.filter(
      (p) => p.dateNightMode && p.status === "upcoming" && p.dateTime
    );
    if (upcoming.length === 0) return;

    const timers = upcoming.map((plan) => {
      const delay = new Date(plan.dateTime).getTime() - Date.now();
      if (delay < 0 || delay > 24 * 60 * 60 * 1000) return null; // only schedule within 24h

      return setTimeout(() => {
        // Auto-start check-in
        const contacts = plan.trustedContacts.length > 0 ? plan.trustedContacts : trustedContacts;
        const now = new Date();
        const intervalMs = settings.defaultCheckInIntervalMinutes * 60 * 1000;
        setActiveCheckIn({
          id: Date.now().toString(),
          personName: plan.personName,
          locationName: plan.locationName,
          startedAt: now.toISOString(),
          intervalMinutes: settings.defaultCheckInIntervalMinutes,
          nextCheckInAt: new Date(now.getTime() + intervalMs).toISOString(),
          trustedContacts: contacts,
          checkInNotificationId: null,
          escalationNotificationId: null,
          missedCheckins: 0,
          lastLocation: null,
        });
        router.push("/date-night");
      }, delay);
    });

    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [datePlans, settings.dateNightPin, settings.defaultCheckInIntervalMinutes, trustedContacts, setActiveCheckIn, router]);

  return null;
}

// ── Navigator ────────────────────────────────────────────────────────────────
function RootLayoutNav() {
  return (
    <>
      <FakeCallWatcher />
      <DateNightWatcher />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coach" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="plan/new" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="checkin" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="start-checkin" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="setup-fake-call" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen
          name="fake-call"
          options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }}
        />
        <Stack.Screen
          name="date-night"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "fade",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="match/[id]" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="sos" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
        <Stack.Screen name="walk-home" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="location-history" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="im-safe" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
        <Stack.Screen name="record" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="recordings" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="phone-setup" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="messages" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="calls" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="conversation/[number]" options={{ headerShown: false, presentation: "card" }} />
      </Stack>
    </>
  );
}

// ── Auth gate ────────────────────────────────────────────────────────────────
// Redirects unauthenticated users to the sign-in flow and keeps signed-in users
// out of the auth screens.
function AuthGate() {
  const clerk = useClerk();
  const segments = useSegments();
  const router = useRouter();
  // NOTE: useAuth()'s isSignedIn is unreliable in this @clerk/expo version
  // (stays stale after setActive() in some flows). We subscribe directly to
  // Clerk's low-level listener instead, which is the primitive every hook
  // internally relies on and is guaranteed to fire on session changes.
  //
  // The listener only forces a re-render — it must NOT be the source of truth.
  // `setActive()` populates `clerk.session` synchronously, but a listener-driven
  // setState lands a tick later. Navigation after sign-in is immediate, so the
  // redirect effect below would run while state still said "signed out" and
  // bounce the user straight back to the login screen. Reading the Clerk
  // singleton during render keeps the gate consistent with what actually
  // happened.
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const unsubscribe = clerk.addListener(() => forceRender());
    return unsubscribe;
  }, [clerk]);

  const loaded = !!clerk.loaded;
  const signedIn = !!clerk.session;

  useEffect(() => {
    if (!signedIn || !clerk.session) return;
    // Verify the cached session is actually still valid server-side.
    // If the underlying user was deleted, sign out so the user can
    // re-authenticate cleanly instead of being stuck showing stale state.
    // IMPORTANT: only sign out when Clerk explicitly reports the session as
    // invalid — a transient network hiccup (e.g. right after an OAuth
    // redirect, before the proxy connection has settled) must NOT sign the
    // user out, or they get bounced straight back to the login screen right
    // after successfully signing in.
    clerk.session.getToken().catch((err: any) => {
      const code = err?.errors?.[0]?.code as string | undefined;
      const invalidSessionCodes = [
        "resource_not_found",
        "session_token_and_uat_claim_check_failed",
        "authentication_invalid",
      ];
      if (code && invalidSessionCodes.includes(code)) {
        clerk.signOut();
      } else {
        console.warn("Session verification failed (non-fatal):", err);
      }
    });
  }, [signedIn, clerk]);

  const inAuthGroup = segments[0] === "(auth)";
  // There is no `app/index.tsx`, so the root route renders nothing. A signed-in
  // user landing there (cold start with a cached session) must be pushed into
  // the tabs or they just stare at an empty screen.
  // Cast: expo-router's typed routes claim there is always >=1 segment, but the
  // bare root URL really does yield an empty array at runtime.
  const atRoot = (segments as string[]).length === 0;

  useEffect(() => {
    if (!loaded) return;
    if (!signedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (signedIn && (inAuthGroup || atRoot)) {
      router.replace("/(tabs)");
    }
  }, [loaded, signedIn, inAuthGroup, atRoot, router]);

  return <RootLayoutNav />;
}

// ── Boot status screen ───────────────────────────────────────────────────────
function StatusScreen({
  message,
  onRetry,
  absolute,
}: {
  message?: string | null;
  onRetry?: () => void;
  absolute?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#240E51",
        ...(absolute
          ? ({
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            } as const)
          : null),
      }}
    >
      {message ? (
        <>
          <Text
            style={{ color: "#fff", textAlign: "center", paddingHorizontal: 32 }}
          >
            {message}
          </Text>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              style={{
                marginTop: 20,
                paddingHorizontal: 28,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: "#fff",
              }}
            >
              <Text
                style={{ color: "#240E51", fontWeight: "600", fontSize: 16 }}
              >
                Try again
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <ActivityIndicator color="#fff" size="large" />
      )}
    </View>
  );
}

const AUTO_RETRY_DELAYS_MS = [3000, 8000, 20000];

// ── Clerk boot gate ──────────────────────────────────────────────────────────
// <ClerkLoaded> renders null for as long as Clerk has not finished
// initialising. When the auth backend is unreachable that "temporary" null
// becomes permanent — and because the splash screen has already been dismissed
// by then, the user is left staring at a blank window with no error message and
// no way to retry.
//
// <ClerkLoaded> stays the readiness check: reading the Clerk singleton before
// it has loaded is not something the native SDK guarantees, so the gate only
// layers a status screen over the top until the real gate opens.
function ClerkReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

// Recovery is automatic first, manual last: a stalled init is retried with
// backoff (3s → 8s → 20s), and immediately when the device regains
// connectivity. Only after all automatic attempts are exhausted does the
// terminal "Try again" screen appear.
//
// Retrying works by remounting ClerkProvider (via key={bootAttempt} in
// RootLayout). That is only safe because nothing below this gate is usable
// yet: every retry effect here is gated on `!clerkReady`, and the moment Clerk
// loads all timers/listeners are cleaned up — so an automatic retry can never
// fire while the user is signed in and using the app.
const FINAL_ATTEMPT_TIMEOUT_MS = 20000;

function ClerkBootGate({
  attempt,
  onAutoRetry,
  onRetry,
  children,
}: {
  /** Which boot attempt this is (0-based); drives the backoff schedule. */
  attempt: number;
  onAutoRetry: () => void;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const [clerkReady, setClerkReady] = React.useState(false);
  const [timedOut, setTimedOut] = React.useState(false);
  const markReady = React.useCallback(() => {
    // The app is up; hand error handling back to the platform.
    endStartupDiagnostics();
    setClerkReady(true);
  }, []);

  const autoRetriesLeft = attempt < AUTO_RETRY_DELAYS_MS.length;

  // Scheduled retry: wait out this attempt's backoff window, then either
  // remount for another automatic attempt or surface the manual screen.
  useEffect(() => {
    if (clerkReady) return;
    const delay = autoRetriesLeft
      ? AUTO_RETRY_DELAYS_MS[attempt]
      : FINAL_ATTEMPT_TIMEOUT_MS;
    const id = setTimeout(() => {
      if (autoRetriesLeft) {
        onAutoRetry();
      } else {
        setTimedOut(true);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [clerkReady, attempt, autoRetriesLeft, onAutoRetry]);

  // Connectivity-restored retry: don't make a user who just walked out of a
  // dead zone wait out the timer. Fires at most once per mount, only on an
  // offline → online transition, and never once Clerk has loaded (the effect
  // is torn down).
  useEffect(() => {
    if (clerkReady || timedOut) return;
    let wasOffline = false;
    let fired = false;
    const subscription = Network.addNetworkStateListener((state) => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      if (!online) {
        wasOffline = true;
      } else if (wasOffline && !fired) {
        fired = true;
        onAutoRetry();
      }
    });
    return () => subscription.remove();
  }, [clerkReady, timedOut, onAutoRetry]);

  return (
    <>
      <ClerkLoaded>
        <ClerkReadySignal onReady={markReady} />
        {children}
      </ClerkLoaded>
      {clerkReady ? null : (
        <StatusScreen
          absolute
          message={
            timedOut
              ? "Couldn't reach the sign-in service.\n\nCheck your internet connection, then tap Try again."
              : null
          }
          onRetry={timedOut ? onRetry : undefined}
        />
      )}
    </>
  );
}

// ── Startup crash screen ─────────────────────────────────────────────────────
function FatalErrorScreen({ fatal }: { fatal: FatalInfo }) {
  // Most stacks repeat the message on their first line; don't print it twice.
  const stack = fatal.stack.startsWith(fatal.message)
    ? fatal.stack.slice(fatal.message.length).replace(/^\n+/, "")
    : fatal.stack;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#240E51",
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 28,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        LoopIn hit an error starting up
      </Text>
      <Text style={{ color: "#C9BCE4", fontSize: 14, marginBottom: 16 }}>
        Please screenshot this and send it over — it says exactly what went
        wrong.
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text
          selectable
          style={{
            color: "#fff",
            fontSize: 12,
            lineHeight: 18,
            fontFamily: Platform.select({
              ios: "Menlo",
              android: "monospace",
              default: "monospace",
            }),
          }}
        >
          {fatal.message}
          {stack ? `\n\n${stack}` : ""}
        </Text>
      </ScrollView>
      <Pressable
        onPress={() => {
          reloadAppAsync().catch(() => {});
        }}
        style={{
          marginTop: 12,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: "#fff",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#240E51", fontWeight: "600", fontSize: 16 }}>
          Reload
        </Text>
      </Pressable>
    </View>
  );
}

function StartupErrorFallback({ error }: { error: Error }) {
  return (
    <FatalErrorScreen
      fatal={{
        message: `${error.name}: ${error.message}`,
        stack: (error.stack ?? "").split("\n").slice(0, 12).join("\n"),
      }}
    />
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const fatal = useFatalError();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const {
    publishableKey,
    proxyUrl: clerkProxyUrl,
    keyError,
    retryKeyFetch,
  } = useClerkPublishableKey();

  // Remounting ClerkProvider is what actually retries a failed Clerk init —
  // refetching the config alone would leave the dead instance in place.
  const [bootAttempt, setBootAttempt] = React.useState(0);
  // Position in the automatic backoff schedule. Distinct from bootAttempt: a
  // manual "Try again" resets this to 0 so the user gets a fresh round of
  // automatic retries, while bootAttempt only ever increments (it is the
  // remount key, so it must never repeat).
  const [autoAttempt, setAutoAttempt] = React.useState(0);
  const retryBoot = React.useCallback(() => {
    retryKeyFetch();
    setAutoAttempt(0);
    setBootAttempt((n) => n + 1);
  }, [retryKeyFetch]);
  const autoRetryBoot = React.useCallback(() => {
    retryKeyFetch();
    setAutoAttempt((n) => n + 1);
    setBootAttempt((n) => n + 1);
  }, [retryKeyFetch]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && (publishableKey || keyError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, publishableKey, keyError]);

  // A startup crash must never be left sitting behind the splash screen — that
  // is the "shows the logo, then quits" symptom, with the reason invisible.
  useEffect(() => {
    if (fatal) SplashScreen.hideAsync().catch(() => {});
  }, [fatal]);

  if (fatal) return <FatalErrorScreen fatal={fatal} />;

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    return (
      <StatusScreen
        message={keyError}
        onRetry={keyError ? retryBoot : undefined}
      />
    );
  }

  // The outer boundary sits above ClerkProvider so a render error in auth setup
  // shows a readable reason instead of taking the whole app down. The inner one
  // keeps its friendlier fallback for errors inside the signed-in app.
  return (
    <ErrorBoundary FallbackComponent={StartupErrorFallback}>
      <ClerkProvider
        key={bootAttempt}
        publishableKey={publishableKey}
        tokenCache={tokenCache}
        proxyUrl={clerkProxyUrl}
      >
        <ClerkBootGate
          attempt={autoAttempt}
          onAutoRetry={autoRetryBoot}
          onRetry={retryBoot}
        >
          <SafeAreaProvider>
            <ErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <AppProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <AuthGate />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </AppProvider>
              </QueryClientProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </ClerkBootGate>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
