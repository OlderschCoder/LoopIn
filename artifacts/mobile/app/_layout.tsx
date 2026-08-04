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
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { ClerkProvider, ClerkLoaded, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();

const envPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || undefined;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Base URL of the API server (same convention as hooks/usePhone.ts).
const _rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");
const API_BASE_URL = _rawApiUrl.replace(/\/$/, "");

/**
 * Resolve the Clerk publishable key. Release builds made in CI don't bake the
 * key in; instead they fetch it from the API server at startup so the correct
 * key (pk_test in dev, pk_live in production) is always used.
 */
function useClerkPublishableKey(): {
  publishableKey: string | undefined;
  keyError: string | null;
} {
  const [fetchedKey, setFetchedKey] = React.useState<string | undefined>();
  const [keyError, setKeyError] = React.useState<string | null>(null);

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
          const data = (await res.json()) as { clerkPublishableKey?: string };
          if (!data.clerkPublishableKey) throw new Error("No key in response");
          if (!cancelled) setFetchedKey(data.clerkPublishableKey);
          return;
        } catch {
          if (cancelled) return;
          if (attempt === 2) {
            setKeyError(
              "Could not reach the server. Check your internet connection and reopen the app.",
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
  }, []);

  return { publishableKey: envPublishableKey ?? fetchedKey, keyError };
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

  useEffect(() => {
    if (!loaded) return;
    if (!signedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (signedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loaded, signedIn, inAuthGroup, router]);

  return <RootLayoutNav />;
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { publishableKey, keyError } = useClerkPublishableKey();

  useEffect(() => {
    if ((fontsLoaded || fontError) && (publishableKey || keyError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, publishableKey, keyError]);

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#240E51" }}>
        {keyError ? (
          <Text style={{ color: "#fff", textAlign: "center", paddingHorizontal: 32 }}>{keyError}</Text>
        ) : (
          <ActivityIndicator color="#fff" size="large" />
        )}
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
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
      </ClerkLoaded>
    </ClerkProvider>
  );
}
