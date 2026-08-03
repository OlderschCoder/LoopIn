import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useColors } from "@/hooks/useColors";

export default function SOSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trustedContacts, activeCheckIn } = useApp();
  const { endCheckIn } = useCheckIn();
  const [alertSent, setAlertSent] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");

  async function handleCall911() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === "web") {
      Alert.alert("Call 911", "In a real emergency, call 911 immediately.");
      return;
    }
    Linking.openURL("tel:911");
  }

  async function handleAlertCircle() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (trustedContacts.length === 0) {
      Alert.alert("No contacts", "Add trusted contacts in Settings so they can be alerted in an emergency.");
      return;
    }
    const contact = trustedContacts[0];
    const msg = `🚨 SAFETY ALERT: I may need help. This is an automated emergency message from LoopIn. Please check on me immediately.`;
    await Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() => {});
    setAlertSent(true);
  }

  async function handleImSafe() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (activeCheckIn) endCheckIn();
    router.replace("/im-safe");
  }

  function startBreathing() {
    setBreathing(true);
    setBreathPhase("in");
    let phase: "in" | "hold" | "out" = "in";
    const sequence: Array<{ phase: "in" | "hold" | "out"; duration: number }> = [
      { phase: "in", duration: 4000 },
      { phase: "hold", duration: 4000 },
      { phase: "out", duration: 4000 },
    ];
    let i = 0;
    const next = () => {
      i = (i + 1) % sequence.length;
      setBreathPhase(sequence[i].phase);
      timer = setTimeout(next, sequence[i].duration);
    };
    let timer = setTimeout(next, sequence[0].duration);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0F0820" }}>
      <LinearGradient
        colors={["#0F0820", "#1A0A35", "#0F0820"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Call 911 — biggest, most urgent */}
        <TouchableOpacity
          onPress={handleCall911}
          activeOpacity={0.85}
          style={styles.call911Btn}
        >
          <View style={styles.call911Inner}>
            <Feather name="phone-call" size={28} color="#FFFFFF" />
            <Text style={styles.call911Text}>Call 911</Text>
            <Text style={styles.call911Sub}>Immediate emergency services</Text>
          </View>
        </TouchableOpacity>

        {/* Alert my circle */}
        <TouchableOpacity
          onPress={handleAlertCircle}
          activeOpacity={0.85}
          style={[
            styles.alertBtn,
            alertSent && { opacity: 0.6 },
          ]}
        >
          <LinearGradient colors={["#9333EA", "#7C3AED"]} style={styles.alertInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Feather name={alertSent ? "check-circle" : "bell"} size={22} color="#FFFFFF" />
            <View>
              <Text style={styles.alertText}>
                {alertSent ? "Alert sent!" : "Alert my circle"}
              </Text>
              <Text style={styles.alertSub}>
                {trustedContacts.length > 0
                  ? `Texts ${trustedContacts.length} contact${trustedContacts.length > 1 ? "s" : ""} with your location`
                  : "No contacts set up yet"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Other options</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Secondary actions */}
        <View style={styles.secondaryGrid}>
          <TouchableOpacity
            onPress={() => { router.back(); setTimeout(() => router.push("/setup-fake-call"), 300); }}
            style={styles.secondaryBtn}
          >
            <View style={[styles.secondaryIcon, { backgroundColor: "#1E3A5F" }]}>
              <Feather name="phone" size={18} color="#60A5FA" />
            </View>
            <Text style={styles.secondaryLabel}>Fake Call</Text>
            <Text style={styles.secondarySub}>Excuse to leave now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { router.back(); setTimeout(() => router.push("/coach"), 300); }}
            style={styles.secondaryBtn}
          >
            <View style={[styles.secondaryIcon, { backgroundColor: "#2D1B4E" }]}>
              <Feather name="message-circle" size={18} color="#C084FC" />
            </View>
            <Text style={styles.secondaryLabel}>AI Coach</Text>
            <Text style={styles.secondarySub}>Get exit advice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startBreathing}
            style={styles.secondaryBtn}
          >
            <View style={[styles.secondaryIcon, { backgroundColor: "#1A3340" }]}>
              <Feather name="wind" size={18} color="#67E8F9" />
            </View>
            <Text style={styles.secondaryLabel}>Breathe</Text>
            <Text style={styles.secondarySub}>Calm down</Text>
          </TouchableOpacity>
        </View>

        {/* Breathing exercise */}
        {breathing && (
          <View style={styles.breathingCard}>
            <Text style={styles.breathingTitle}>
              {breathPhase === "in" ? "Breathe in..." : breathPhase === "hold" ? "Hold..." : "Breathe out..."}
            </Text>
            <View style={[
              styles.breathingCircle,
              breathPhase === "in" && { transform: [{ scale: 1.2 }] },
              breathPhase === "out" && { transform: [{ scale: 0.8 }] },
            ]}>
              <Feather name="wind" size={24} color="#67E8F9" />
            </View>
            <Text style={styles.breathingHint}>4 seconds each · repeat</Text>
            <TouchableOpacity onPress={() => setBreathing(false)}>
              <Text style={styles.breathingStop}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exit tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Exit phrases that work</Text>
          {[
            "\"I have to take this call — it's urgent.\"",
            "\"My friend just texted, she needs me right now.\"",
            "\"I'm not feeling well — I need to head home.\"",
            "\"My roommate locked herself out, I have to go.\"",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.35)" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* I'm okay */}
        <TouchableOpacity onPress={handleImSafe} style={styles.okayBtn} activeOpacity={0.85}>
          <Feather name="check-circle" size={18} color="#34D399" />
          <Text style={styles.okayText}>I'm okay — false alarm</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },

  call911Btn: { borderRadius: 24, overflow: "hidden", shadowColor: "#E11D48", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  call911Inner: { backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 6 },
  call911Text: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  call911Sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },

  alertBtn: { borderRadius: 20, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  alertInner: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 20, paddingHorizontal: 22 },
  alertText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  alertSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },

  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.3)" },

  secondaryGrid: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 16, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  secondaryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  secondaryLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  secondarySub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", textAlign: "center" },

  breathingCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 24, alignItems: "center", gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  breathingTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  breathingCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(103,232,249,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#67E8F9" },
  breathingHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  breathingStop: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)" },

  tipsCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  tipsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", flex: 1, lineHeight: 18, fontStyle: "italic" },

  okayBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  okayText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#34D399" },
});
