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

  const goHome = () => router.replace("/(tabs)");

  const handleCreate = async () => {
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      await clerk.client!.signUp.create({ emailAddress: email, password });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Could not create account. Try a different email.";
      setError(msg);
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
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Incorrect code. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    try {
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch {
      setError("Could not resend code.");
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
          <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

          <TextInput
            style={styles.input}
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            editable={!busy}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!code || busy) && styles.disabled]}
            onPress={handleVerify}
            disabled={!code || busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify &amp; Continue</Text>}
          </Pressable>

          <Pressable onPress={handleResend} disabled={busy}>
            <Text style={styles.linkText}>Resend code</Text>
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
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
  subtitle: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#6366f1", borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  linkText: { color: "#6366f1", textAlign: "center", fontSize: 15, fontWeight: "600" },
});
