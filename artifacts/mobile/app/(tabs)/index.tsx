import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DateCard from "@/components/DateCard";
import { useApp } from "@/context/AppContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useColors } from "@/hooks/useColors";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Stay safe tonight";
}

function msUntil(isoStr: string) {
  return Math.max(0, new Date(isoStr).getTime() - Date.now());
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { datePlans, activeCheckIn, trustedContacts } = useApp();
  const { endCheckIn } = useCheckIn();
  const [greeting] = useState(getGreeting());

  const upcoming = datePlans
    .filter((p) => p.status === "upcoming" || p.status === "active")
    .slice(0, 2);

  const hasCircle = trustedContacts.length > 0;
  const topPadding = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  async function handleImSafe() {
    if (activeCheckIn && activeCheckIn.trustedContacts.length > 0) {
      const contact = activeCheckIn.trustedContacts[0];
      const msg = `Hi, just letting you know I made it home safely! 💜 – LoopIn`;
      await Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() => {});
    }
    if (activeCheckIn) endCheckIn();
    router.push("/im-safe");
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding,
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 90,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
          <Text style={[styles.appName, { color: colors.foreground }]}>LoopIn</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="settings" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/sos")}
            style={[styles.sosHeaderBtn]}
            activeOpacity={0.8}
          >
            <Text style={styles.sosHeaderText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Safety Circle status card ── */}
      <LinearGradient
        colors={activeCheckIn ? ["#1E1035", "#2D1B69"] : ["#1E1035", "#3B1F6D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.circleCard}
      >
        {activeCheckIn ? (
          <>
            <View style={styles.circleCardRow}>
              <View style={[styles.activeDot, { backgroundColor: colors.safe }]} />
              <Text style={styles.circleCardLabel}>ACTIVE DATE CHECK-IN</Text>
            </View>
            <Text style={styles.circleCardName}>{activeCheckIn.personName}</Text>
            <Text style={styles.circleCardSub}>
              {activeCheckIn.trustedContacts.length > 0
                ? `${activeCheckIn.trustedContacts.length} contact${activeCheckIn.trustedContacts.length > 1 ? "s" : ""} watching over you`
                : "No contacts monitoring — add some in Settings"}
            </Text>
            <View style={styles.circleCardFooter}>
              <Feather name="clock" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.circleCardFooterText}>
                Next check-in:{" "}
                {msUntil(activeCheckIn.nextCheckInAt) === 0
                  ? "Now"
                  : `${Math.ceil(msUntil(activeCheckIn.nextCheckInAt) / 60000)} min`}
              </Text>
              <TouchableOpacity onPress={() => router.push("/checkin")}>
                <Text style={styles.openLink}>Open →</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : hasCircle ? (
          <>
            <Text style={styles.circleCardLabel}>YOUR SAFETY CIRCLE</Text>
            <Text style={styles.circleCardName}>
              {trustedContacts.length} {trustedContacts.length === 1 ? "person" : "people"} watching over you
            </Text>
            <View style={styles.avatarRow}>
              {trustedContacts.slice(0, 4).map((c) => (
                <View key={c.id} style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
              ))}
              {trustedContacts.length > 4 && (
                <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={styles.avatarText}>+{trustedContacts.length - 4}</Text>
                </View>
              )}
            </View>
            <Text style={styles.circleCardSub}>Start a check-in before your next date</Text>
          </>
        ) : (
          <>
            <View style={styles.circleCardRow}>
              <Feather name="alert-circle" size={13} color="#FCD34D" />
              <Text style={[styles.circleCardLabel, { color: "#FCD34D" }]}>NO SAFETY CIRCLE YET</Text>
            </View>
            <Text style={styles.circleCardName}>Add people who will watch over you</Text>
            <Text style={styles.circleCardSub}>
              Trusted contacts get alerts if you miss a check-in
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={styles.addCircleBtn}
            >
              <Feather name="user-plus" size={13} color="#7C3AED" />
              <Text style={styles.addCircleBtnText}>Add trusted contacts</Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>

      {/* ── Two hero action buttons ── */}
      <View style={styles.heroActions}>
        <TouchableOpacity
          onPress={() => activeCheckIn ? router.push("/checkin") : router.push("/start-checkin")}
          activeOpacity={0.85}
          style={[styles.heroBtn, { backgroundColor: colors.primary }]}
        >
          <View style={styles.heroBtnIcon}>
            <Feather name="shield" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={styles.heroBtnTitle}>
            {activeCheckIn ? "Check-In Active" : "Start Check-In"}
          </Text>
          <Text style={styles.heroBtnSub}>
            {activeCheckIn ? "Tap to open" : "GPS + auto-alerts"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImSafe}
          activeOpacity={0.85}
          style={[styles.heroBtn, { backgroundColor: colors.safe }]}
        >
          <View style={styles.heroBtnIcon}>
            <Feather name="home" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={styles.heroBtnTitle}>I'm Home Safe</Text>
          <Text style={styles.heroBtnSub}>
            {activeCheckIn ? "End & notify circle" : "Let your circle know"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Walk Me Home banner ── */}
      <TouchableOpacity
        onPress={() => router.push("/walk-home")}
        activeOpacity={0.88}
        style={[styles.walkBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.walkIcon, { backgroundColor: colors.surface }]}>
          <Feather name="navigation" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.walkTitle, { color: colors.foreground }]}>Walk Me Home</Text>
          <Text style={[styles.walkSub, { color: colors.mutedForeground }]}>
            Set a timer — your circle auto-alerts if you don't check in
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* ── SOS emergency banner ── */}
      <TouchableOpacity
        onPress={() => router.push("/sos")}
        activeOpacity={0.88}
        style={[styles.sosBanner, { backgroundColor: colors.sosLight, borderColor: colors.sos + "30" }]}
      >
        <View style={[styles.sosIcon, { backgroundColor: colors.sos + "15" }]}>
          <Feather name="alert-octagon" size={18} color={colors.sos} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sosTitle, { color: colors.sos }]}>Emergency SOS</Text>
          <Text style={[styles.sosSub, { color: colors.sos + "AA" }]}>
            Instantly alert your circle and call for help
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.sos + "80"} />
      </TouchableOpacity>

      {/* ── Features grid ── */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tools</Text>
      <View style={styles.featureGrid}>
        {[
          { icon: "zap" as const, label: "AI Analysis", sub: "Red flag check", onPress: () => router.push("/(tabs)/ai"), color: colors.primary },
          { icon: "calendar" as const, label: "Plan a Date", sub: "Safety scoring", onPress: () => router.push("/plan/new"), color: "#6D28D9" },
          { icon: "phone-call" as const, label: "Fake Call", sub: "Instant exit", onPress: () => router.push("/setup-fake-call"), color: "#0369A1" },
          { icon: "message-circle" as const, label: "AI Coach", sub: "Get guidance", onPress: () => router.push("/coach"), color: "#DB2777" },
          { icon: "mic" as const, label: "Record Date", sub: "Private audio", onPress: () => router.push("/record"), color: "#0891B2" },
          { icon: "lock" as const, label: "Evidence Locker", sub: "Private notes", onPress: () => router.push("/(tabs)/locker"), color: "#059669" },
          { icon: "heart" as const, label: "Reflect", sub: "Track patterns", onPress: () => router.push("/(tabs)/reflect"), color: "#D97706" },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.8}
            style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.featureIcon, { backgroundColor: item.color + "12" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[styles.featureLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Upcoming dates ── */}
      {upcoming.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming dates</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/plan")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
            </TouchableOpacity>
          </View>
          {upcoming.map((plan) => (
            <DateCard key={plan.id} plan={plan} onPress={() => router.push("/start-checkin")} />
          ))}
        </>
      )}

      {/* ── Safety tip ── */}
      <View style={[styles.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Tip: </Text>
          Add at least one trusted contact before every date. They'll be alerted automatically if you miss a check-in.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  greeting: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sosHeaderBtn: { backgroundColor: "#E11D48", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, shadowColor: "#E11D48", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  sosHeaderText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  circleCard: { borderRadius: 22, padding: 22, marginBottom: 14, gap: 6 },
  circleCardRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  circleCardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" },
  circleCardName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 27 },
  circleCardSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", lineHeight: 18 },
  circleCardFooter: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  circleCardFooterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", flex: 1 },
  openLink: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#A78BFA" },
  avatarRow: { flexDirection: "row", gap: 8, marginVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(124,58,237,0.6)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  addCircleBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "flex-start", marginTop: 4 },
  addCircleBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#7C3AED" },

  heroActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  heroBtn: { flex: 1, borderRadius: 18, padding: 18, gap: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  heroBtnIcon: { marginBottom: 6 },
  heroBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  heroBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },

  walkBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  walkIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  walkTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  walkSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },

  sosBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 22 },
  sosIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sosTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  sosSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  featureCard: { width: "31%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 6, flex: 1, minWidth: "28%" },
  featureIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  featureLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  featureSub: { fontSize: 11, fontFamily: "Inter_400Regular" },

  tipCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4 },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
});
