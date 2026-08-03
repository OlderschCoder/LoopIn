import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useAuth, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded } = useAuth();
  const clerk = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goHome = () => router.replace("/(tabs)");

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      // Use the app's native scheme — must match what's registered in Clerk's allowed redirect URLs
      const redirectUrl = Linking.createURL("sso-callback");

      await clerk.client!.signIn.create({
        strategy: "oauth_google",
        redirectUrl,
      });

      const { externalVerificationRedirectURL } =
        clerk.client!.signIn.firstFactorVerification;
      if (!externalVerificationRedirectURL) {
        throw new Error("No Google redirect URL received from Clerk.");
      }

      // --- ANDROID FIX ---
      // On Android, Chrome Custom Tabs handles the OAuth redirect by firing a system
      // intent (which reopens the app) rather than returning the URL through
      // openAuthSessionAsync. We set up a Linking listener BEFORE opening the browser
      // so it fires even while we're awaiting the browser result.
      let linkingResolve!: (url: string | null) => void;
      const linkingPromise = new Promise<string | null>(
        (res) => { linkingResolve = res; },
      );
      const linkingSub = Linking.addEventListener("url", ({ url }) => {
        if (url.startsWith("mobile://")) linkingResolve(url);
      });

      // Open the browser for Google OAuth
      const browserResult = await WebBrowser.openAuthSessionAsync(
        externalVerificationRedirectURL.toString(),
        redirectUrl,
      );

      let callbackUrl: string | null = null;

      if (browserResult.type === "success" && (browserResult as any).url) {
        // iOS or Android where openAuthSessionAsync intercepted the redirect
        callbackUrl = (browserResult as any).url;
        linkingResolve(null); // unblock linkingPromise so we don't leave it hanging
      } else {
        // Android fallback: linkingPromise may already be resolved (fired during await above)
        // or we wait up to 2.5 s for it, then assume the user cancelled
        callbackUrl = await Promise.race([
          linkingPromise,
          new Promise<null>((res) => setTimeout(() => res(null), 2500)),
        ]);
      }
      linkingSub.remove();

      if (!callbackUrl) {
        // User closed the browser / cancelled
        setBusy(false);
        return;
      }

      // Extract the rotating_token_nonce from the callback URL
      const nonceMatch = callbackUrl.match(/[?&]rotating_token_nonce=([^&]+)/);
      const nonce = nonceMatch ? decodeURIComponent(nonceMatch[1]) : "";

      await clerk.client!.signIn.reload({ rotatingTokenNonce: nonce });
      const si = clerk.client!.signIn;

      if (si.firstFactorVerification.status === "transferable") {
        // First-time Google user — transfer into a new Clerk account
        await clerk.client!.signUp.create({ transfer: true });
        await clerk.setActive({ session: clerk.client!.signUp.createdSessionId });
      } else {
        await clerk.setActive({ session: si.createdSessionId });
      }
      goHome();
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Google sign-in failed. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      const signInAttempt = await clerk.client!.signIn.create({
        identifier: email,
        password,
      });
      if (signInAttempt.status === "complete") {
        await clerk.setActive({ session: signInAttempt.createdSessionId });
        goHome();
      } else {
        setError("Sign-in incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Incorrect email or password.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>LoopIn</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Pressable
          style={[styles.button, styles.googleBtn, (!isLoaded || busy) && styles.disabled]}
          onPress={handleGoogle}
          disabled={!isLoaded || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continue with Google</Text>
          )}
        </Pressable>

        <Text style={styles.orText}>— or sign in with email —</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, (!isLoaded || !email || !password || busy) && styles.disabled]}
          onPress={handleEmailSignIn}
          disabled={!isLoaded || !email || !password || busy}
        >
          <Text style={styles.btnText}>Sign In</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/sign-up")} disabled={busy}>
          <Text style={styles.linkText}>Don't have an account? Create one</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 30, fontWeight: "bold", textAlign: "center", color: "#111" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#6366f1", borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
  },
  googleBtn: { backgroundColor: "#4285f4" },
  disabled: { opacity: 0.45 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  orText: { textAlign: "center", color: "#aaa", fontSize: 14 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  linkText: { color: "#6366f1", textAlign: "center", fontSize: 15, fontWeight: "600" },
});
