import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded } = useAuth();
  const clerk = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SECS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const goHome = () => router.replace("/(tabs)");

  /** Extract the most useful human-readable message from a Clerk error. */
  const extractClerkError = (err: any): string => {
    const clerkErr = err?.errors?.[0];
    // Clerk long messages are most descriptive
    if (clerkErr?.longMessage) return clerkErr.longMessage;
    if (clerkErr?.message) return clerkErr.message;
    // Fallback for plain JS errors
    if (err?.message) return err.message;
    return "Something went wrong. Please try again.";
  };

  const handleCreate = async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      await clerk.client!.signUp.create({ emailAddress: email, password });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      startCooldown();
    } catch (err: any) {
      setError(extractClerkError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      const result = await clerk.client!.signUp.attemptEmailAddressVerification({ code });
      // Clerk sometimes hands back a usable session without reporting
      // "complete" (e.g. extra optional fields outstanding) — take it either way.
      if (result.status === "complete" || result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        goHome();
      } else {
        // Surface the real status so a failure here is diagnosable instead of
        // dead-ending on a generic message.
        setError(
          `Sign-up couldn't be completed (${result.status}). Please try again.`,
        );
      }
    } catch (err: any) {
      setError(extractClerkError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || busy) return;
    setError(null);
    try {
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      startCooldown();
    } catch (err: any) {
      setError("Could not resend the code. " + extractClerkError(err));
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          <Text style={styles.spamHint}>
            💡 Can't find it? Check your spam or junk folder — it sometimes lands there.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            editable={!busy}
            maxLength={6}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!code || busy) && styles.disabled]}
            onPress={handleVerify}
            disabled={!code || busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify &amp; Continue</Text>}
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || busy}
            style={[styles.resendBtn, (resendCooldown > 0 || busy) && styles.disabled]}
          >
            <Text style={styles.linkText}>
              {resendCooldown > 0
                ? `Resend code (${resendCooldown}s)`
                : "Resend code"}
            </Text>
          </Pressable>

          <Pressable onPress={() => { setPendingVerification(false); setError(null); setCode(""); }} disabled={busy}>
            <Text style={[styles.linkText, styles.mutedLink]}>← Use a different email</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up for LoopIn</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor="#aaa"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Clerk's bot-sign-up protection is enabled by default and mounts its
            challenge into this node. Without it, signUp.create() is rejected in
            production with "captcha_missing_token" — dev instances let it slide,
            which is why this only ever failed on the published app. */}
        <View nativeID="clerk-captcha" />

        <Pressable
          style={[styles.button, (!isLoaded || !email || !password || busy) && styles.disabled]}
          onPress={handleCreate}
          disabled={!isLoaded || !email || !password || busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} disabled={busy}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 30, fontWeight: "bold", textAlign: "center", color: "#111" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 4 },
  emailHighlight: { fontWeight: "600", color: "#333" },
  spamHint: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    backgroundColor: "#f9f6ff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, backgroundColor: "#fafafa",
    color: "#111",
  },
  button: {
    backgroundColor: "#6366f1", borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
  },
  resendBtn: { paddingVertical: 4 },
  disabled: { opacity: 0.45 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  linkText: { color: "#6366f1", textAlign: "center", fontSize: 15, fontWeight: "600" },
  mutedLink: { color: "#888", fontWeight: "400", fontSize: 14 },
});

const RESEND_COOLDOWN_SECS = 30;
