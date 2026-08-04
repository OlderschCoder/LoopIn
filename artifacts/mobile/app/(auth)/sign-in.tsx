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

  /**
   * Finish a Google sign-in from the `loopin:///sso-callback?...` URL.
   * Split out of handleGoogle so it can also run when Android killed the app
   * while the OAuth browser was open and relaunched it via the callback intent
   * — in that case there is no in-flight handleGoogle call to receive the URL.
   */
  const completeOAuthCallback = async (callbackUrl: string) => {
    const nonceMatch = callbackUrl.match(/[?&]rotating_token_nonce=([^&]+)/);
    const nonce = nonceMatch ? decodeURIComponent(nonceMatch[1]) : "";

    await clerk.client!.signIn.reload({ rotatingTokenNonce: nonce });
    const si = clerk.client!.signIn;

    if (si.firstFactorVerification.status === "transferable") {
      // First-time Google user — transfer into a new Clerk account
      await clerk.client!.signUp.create({ transfer: true });
      await clerk.setActive({ session: clerk.client!.signUp.createdSessionId });
      goHome();
      return;
    }

    // Google sign-in can also land on the second-factor step.
    const handled = await continueSignIn(si);
    if (!handled) {
      setError(`Sign-in couldn't be completed (${si.status}). Please try again.`);
    }
  };

  // Cold-start recovery: if Android relaunched the app straight into the OAuth
  // callback, no handleGoogle promise is waiting for it, so pick it up here.
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    const resume = async (url: string | null) => {
      if (cancelled || !url || !url.includes("sso-callback")) return;
      setBusy(true);
      setError(null);
      try {
        await completeOAuthCallback(url);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.errors?.[0]?.longMessage ??
              err?.errors?.[0]?.message ??
              "Google sign-in didn't finish. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    Linking.getInitialURL().then(resume).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => resume(url));
    return () => {
      cancelled = true;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

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
        // Match the app's current scheme (loopin://) — derived from redirectUrl
        // so a future scheme rename can't silently break this listener again.
        const schemePrefix = redirectUrl.split("sso-callback")[0];
        if (url.startsWith(schemePrefix)) linkingResolve(url);
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

      await completeOAuthCallback(callbackUrl);
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
