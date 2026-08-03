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
import { ActivityIndicator, Platform, View } from "react-native";
import { ClerkProvider, ClerkLoaded, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

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
  const [state, setState] = React.useState(() => ({
    loaded: !!clerk.loaded,
    signedIn: !!clerk.session,
  }));

  useEffect(() => {
    const unsubscribe = clerk.addListener((resources: any) => {
      setState({ loaded: true, signedIn: !!resources.session });
    });
    return unsubscribe;
  }, [clerk]);

  useEffect(() => {
    if (!state.signedIn || !clerk.session) return;
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
  }, [state.signedIn, clerk]);

  useEffect(() => {
    if (!state.loaded) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!state.signedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (state.signedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [state, segments, router]);

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

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
