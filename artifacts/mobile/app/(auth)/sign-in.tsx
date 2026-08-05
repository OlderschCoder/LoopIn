import React, { useEffect, useState } from "react";
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
import { useAuth, useClerk, useSSO } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

/**
 * Warms up the in-app browser on Android so the OAuth handoff is quicker and
 * — more importantly — so Custom Tabs is already bound when we open it.
 */
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded } = useAuth();
  const clerk = useClerk();
  // Clerk's own SSO flow. It owns the browser handoff and the return trip,
  // including the proxy rewrite in production — which hand-rolled
  // openAuthSessionAsync/Linking code cannot do correctly.
  const { startSSOFlow } = useSSO();
  useWarmUpBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clerk requires an emailed one-time code as a second step on this instance,
  // so sign-in is two stages: credentials, then the code.
  const [stage, setStage] = useState<"credentials" | "code">("credentials");
  const [code, setCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  // Remember which address Clerk sent the code to, so "resend" targets the same
  // one. Google sign-in has no email typed into the form to fall back on.
  const [secondFactorEmailId, setSecondFactorEmailId] = useState<string | null>(null);

  const goHome = () => router.replace("/(tabs)");

  /**
   * Advance a sign-in attempt that is not yet complete. Returns true when the
   * caller can stop (either signed in, or we've moved the UI to the code step).
   */
  const continueSignIn = async (attempt: any): Promise<boolean> => {
    if (attempt?.status === "complete") {
      await clerk.setActive({ session: attempt.createdSessionId });
      goHome();
      return true;
    }

    // Both of these mean "password was accepted, now prove it's really you via
    // an emailed one-time code". `needs_client_trust` is what Clerk returns for
    // an unrecognised device, which is every fresh install.
    if (
      attempt?.status === "needs_second_factor" ||
      attempt?.status === "needs_client_trust"
    ) {
      const emailFactor = (attempt.supportedSecondFactors ?? []).find(
        (f: any) => f.strategy === "email_code",
      );
      const emailAddressId: string | null = emailFactor?.emailAddressId ?? null;
      await clerk.client!.signIn.prepareSecondFactor({
        strategy: "email_code",
        // Omitted when unknown — Clerk falls back to the primary address.
        ...(emailAddressId ? { emailAddressId } : {}),
      } as any);
      setSecondFactorEmailId(emailAddressId);
      setCodeSentTo(
        emailFactor?.safeIdentifier ?? attempt?.identifier ?? email ?? null,
      );
      setStage("code");
      return true;
    }

    return false;
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      // startSSOFlow owns the whole browser round trip: it opens the auth
      // session, waits for the callback on the app's own scheme, and reloads
      // the Clerk client afterwards. Critically it also understands the
      // production proxy. The previous hand-rolled version opened the browser
      // itself and gave up after a 2.5s timer, then returned *silently* —
      // which is why sign-in appeared to do nothing at all.
      const { createdSessionId, signIn, signUp } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        goHome();
        return;
      }

      // First-time Google user: Clerk creates a sign-up rather than a sign-in.
      if (signUp?.createdSessionId) {
        await clerk.setActive({ session: signUp.createdSessionId });
        goHome();
        return;
      }

      // Otherwise the attempt needs a further step — usually the emailed code.
      if (signIn && (await continueSignIn(signIn))) return;

      // Never fail silently. If we land here the flow stopped for a reason we
      // don't explicitly handle, and the user is owed an explanation.
      const stoppedAt = signIn?.status ?? signUp?.status;
      setError(
        stoppedAt
          ? `Google sign-in stopped at "${stoppedAt}". Please sign in with email instead.`
          : "Google sign-in was cancelled or didn't come back. Please try again, or sign in with email.",
      );
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
      const handled = await continueSignIn(signInAttempt);
      if (!handled) {
        setError(
          `Sign-in couldn't be completed (${signInAttempt.status}). Please try again.`,
        );
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

  const handleVerifyCode = async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      const attempt = await clerk.client!.signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      } as any);
      if (attempt.status === "complete") {
        await clerk.setActive({ session: attempt.createdSessionId });
        goHome();
      } else {
        setError("That code didn't work. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "That code didn't work. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setBusy(true);
    try {
      await clerk.client!.signIn.prepareSecondFactor({
        strategy: "email_code",
        ...(secondFactorEmailId ? { emailAddressId: secondFactorEmailId } : {}),
      } as any);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Could not resend the code.");
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

        {stage === "code" ? (
          <>
            <Text style={styles.subtitle}>
              Enter the 6-digit code we emailed to{"\n"}
              {codeSentTo ?? email}
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              editable={!busy}
              autoFocus
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.button, (busy || code.trim().length < 6) && styles.disabled]}
              onPress={handleVerifyCode}
              disabled={busy || code.trim().length < 6}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify</Text>
              )}
            </Pressable>

            <Pressable onPress={handleResendCode} disabled={busy}>
              <Text style={styles.linkText}>Didn't get it? Send a new code</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setStage("credentials");
                setCode("");
                setError(null);
              }}
              disabled={busy}
            >
              <Text style={styles.linkText}>Use a different account</Text>
            </Pressable>
          </>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 30, fontWeight: "bold", textAlign: "center", color: "#111" },
  codeInput: { textAlign: "center", fontSize: 26, letterSpacing: 8 },
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
