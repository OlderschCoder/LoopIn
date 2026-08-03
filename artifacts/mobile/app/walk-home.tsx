import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PRESET_TIMES = [
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
];

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WalkHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trustedContacts } = useApp();

  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startTimer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSecondsLeft(selectedMinutes * 60);
    setRunning(true);
    setExpired(false);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          setExpired(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          handleExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleExpired() {
    if (trustedContacts.length > 0) {
      const contact = trustedContacts[0];
      const msg = `🚨 Walk Me Home alert: I started a ${selectedMinutes}-minute walk timer and it expired without me checking in. Please make sure I'm okay.`;
      await Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() => {});
    }
  }

  async function handleMadeIt() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearTimer();
    setRunning(false);
    setExpired(false);

    if (trustedContacts.length > 0) {
      const contact = trustedContacts[0];
      const msg = `✅ I made it home safely! My Walk Me Home timer has ended. – LoopIn`;
      await Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() => {});
    }

    router.replace("/im-safe");
  }

  useEffect(() => () => clearTimer(), []);

  const progress = running ? 1 - secondsLeft / (selectedMinutes * 60) : 0;
  const pct = Math.min(100, Math.round(progress * 100));

  return (
    <LinearGradient colors={["#0D1B2A", "#0F2440", "#0D1B2A"]} style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20 }]}>
        <TouchableOpacity onPress={() => { clearTimer(); router.back(); }} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk Me Home</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 30 }]}>
        {!running && !expired ? (
          /* ── Setup screen ── */
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Feather name="navigation" size={36} color="#60A5FA" />
              </View>
              <Text style={styles.heroTitle}>Set your walk timer</Text>
              <Text style={styles.heroSub}>
                If you don't tap "I made it" before the timer ends, your trusted contacts are automatically alerted.
              </Text>
            </View>

            <Text style={styles.pickLabel}>How long is your walk?</Text>
            <View style={styles.presets}>
              {PRESET_TIMES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setSelectedMinutes(t.value)}
                  style={[
                    styles.preset,
                    selectedMinutes === t.value && styles.presetActive,
                  ]}
                >
                  <Text style={[styles.presetText, selectedMinutes === t.value && styles.presetTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {trustedContacts.length > 0 ? (
              <View style={styles.contactsNote}>
                <Feather name="check-circle" size={14} color="#34D399" />
                <Text style={styles.contactsNoteText}>
                  {trustedContacts.length} contact{trustedContacts.length > 1 ? "s" : ""} will be alerted if your timer expires
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                style={styles.contactsWarning}
              >
                <Feather name="alert-circle" size={14} color="#FCD34D" />
                <Text style={styles.contactsWarningText}>
                  No trusted contacts — add some in Settings for auto-alerts
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={startTimer} style={styles.startBtn} activeOpacity={0.85}>
              <Feather name="play" size={20} color="#FFFFFF" />
              <Text style={styles.startBtnText}>Start {selectedMinutes}-min timer</Text>
            </TouchableOpacity>
          </>
        ) : expired ? (
          /* ── Expired ── */
          <View style={styles.expiredState}>
            <View style={styles.expiredIcon}>
              <Feather name="alert-triangle" size={36} color="#FCD34D" />
            </View>
            <Text style={styles.expiredTitle}>Timer expired</Text>
            <Text style={styles.expiredSub}>
              {trustedContacts.length > 0
                ? "We've alerted your trusted contacts. Are you okay?"
                : "Your timer ran out. Are you home safe?"}
            </Text>
            <TouchableOpacity onPress={handleMadeIt} style={styles.safeBtn} activeOpacity={0.85}>
              <Feather name="home" size={20} color="#FFFFFF" />
              <Text style={styles.safeBtnText}>I'm home safe</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/sos")} style={styles.sosLink}>
              <Text style={styles.sosLinkText}>I need help → Open SOS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Running ── */
          <>
            <View style={styles.countdownWrap}>
              <View style={styles.countdownRing}>
                <Text style={styles.countdownText}>{fmt(secondsLeft)}</Text>
                <Text style={styles.countdownLabel}>remaining</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressText}>{pct}% of walk complete</Text>
            </View>

            {trustedContacts.length > 0 && (
              <View style={styles.watchingCard}>
                <Feather name="eye" size={15} color="#34D399" />
                <Text style={styles.watchingText}>
                  {trustedContacts[0].name}
                  {trustedContacts.length > 1 ? ` +${trustedContacts.length - 1} more` : ""} will be notified if timer expires
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleMadeIt} style={styles.madeItBtn} activeOpacity={0.85}>
              <Feather name="home" size={22} color="#FFFFFF" />
              <Text style={styles.madeItText}>I made it home! 🎉</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { clearTimer(); setRunning(false); }}
              style={styles.cancelLink}
            >
              <Text style={styles.cancelLinkText}>Cancel timer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },

  hero: { alignItems: "center", gap: 12, marginBottom: 36 },
  heroIcon: { width: 80, height: 80, borderRadius: 26, backgroundColor: "rgba(96,165,250,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(96,165,250,0.2)" },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 },

  pickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  preset: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  presetActive: { backgroundColor: "#1E40AF", borderColor: "#60A5FA" },
  presetText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  presetTextActive: { color: "#FFFFFF" },

  contactsNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  contactsNoteText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#34D399", flex: 1, lineHeight: 18 },
  contactsWarning: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(252,211,77,0.07)", borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: "rgba(252,211,77,0.15)" },
  contactsWarningText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FCD34D", flex: 1, lineHeight: 18 },

  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#2563EB", borderRadius: 20, paddingVertical: 18, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  startBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  countdownWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  countdownRing: { width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(37,99,235,0.12)", borderWidth: 3, borderColor: "#3B82F6", alignItems: "center", justifyContent: "center", gap: 4 },
  countdownText: { fontSize: 52, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  countdownLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  progressBarTrack: { width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 3 },
  progressText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },

  watchingCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(52,211,153,0.12)" },
  watchingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#34D399", flex: 1 },

  madeItBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#059669", borderRadius: 20, paddingVertical: 20, shadowColor: "#059669", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8, marginBottom: 16 },
  madeItText: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cancelLink: { alignItems: "center", padding: 12 },
  cancelLinkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.3)" },

  expiredState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 10 },
  expiredIcon: { width: 90, height: 90, borderRadius: 28, backgroundColor: "rgba(252,211,77,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(252,211,77,0.3)" },
  expiredTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  expiredSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 22 },
  safeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#059669", borderRadius: 20, paddingVertical: 18, paddingHorizontal: 32, shadowColor: "#059669", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8, width: "100%", marginTop: 8 },
  safeBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  sosLink: { padding: 14 },
  sosLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FB7185" },
});
