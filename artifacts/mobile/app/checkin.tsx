import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useLocation } from "@/hooks/useLocation";
import { useColors } from "@/hooks/useColors";
import { callLyft, callUber } from "@/utils/callRide";

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    function update() {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function useElapsed(startIso: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    function update() {
      setElapsed(Math.max(0, Date.now() - new Date(startIso).getTime()));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return elapsed;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeCheckIn, settings } = useApp();
  const { confirmSafe, sendSOS, endCheckIn } = useCheckIn();
  const { location, loading: locationLoading, fetchOnce } = useLocation(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [panicMode, setPanicMode] = useState(false);

  const remaining = useCountdown(activeCheckIn?.nextCheckInAt ?? new Date().toISOString());
  const elapsed = useElapsed(activeCheckIn?.startedAt ?? new Date().toISOString());

  useEffect(() => {
    if (remaining < 120000 && remaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [remaining < 120000, pulseAnim]);

  useEffect(() => {
    if (Platform.OS !== "web") fetchOnce();
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!activeCheckIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Check-In</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Feather name="shield-off" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active check-in</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const urgentColor = remaining === 0 ? colors.danger : remaining < 120000 ? colors.warning : colors.safe;
  const isOverdue = remaining === 0;
  const locationText =
    location?.address ??
    activeCheckIn.lastLocation?.address ??
    activeCheckIn.locationName ??
    "Location unavailable";
  const mapsUrl = location?.mapsUrl ?? activeCheckIn.lastLocation?.mapsUrl;

  function handleEndDate() {
    Alert.alert("End date?", "This will stop all check-ins and alerts.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End date",
        style: "destructive",
        onPress: async () => {
          await endCheckIn();
          router.back();
        },
      },
    ]);
  }

  function handlePanic() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPanicMode(true);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#1E1B4B" }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-down" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.activeDot, { backgroundColor: colors.safe }]} />
          <Text style={styles.headerActive}>Active Date</Text>
        </View>
        <TouchableOpacity onPress={handleEndDate}>
          <Text style={styles.endDateText}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Person & elapsed */}
      <View style={styles.personSection}>
        <Text style={styles.personName}>{activeCheckIn.personName}</Text>
        <Text style={styles.elapsedText}>{formatDuration(elapsed)} on this date</Text>
      </View>

      {/* Location card */}
      <TouchableOpacity
        onPress={() => mapsUrl && Linking.openURL(mapsUrl)}
        style={[styles.locationCard, { borderColor: "rgba(255,255,255,0.1)" }]}
        disabled={!mapsUrl}
      >
        <View style={styles.locationLeft}>
          <View style={[styles.locationIcon, { backgroundColor: colors.primary + "40" }]}>
            <Feather name="map-pin" size={16} color={colors.primary} />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>
              {locationLoading ? "Getting location..." : "Current location"}
            </Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {Platform.OS === "web" ? "GPS not available in web preview" : locationText}
            </Text>
          </View>
        </View>
        {mapsUrl && <Feather name="external-link" size={16} color="rgba(255,255,255,0.4)" />}
      </TouchableOpacity>

      {/* Countdown */}
      <View style={styles.countdownSection}>
        <Text style={[styles.countdownLabel, { color: "rgba(255,255,255,0.6)" }]}>
          {isOverdue ? "Check-in overdue" : "Next check-in in"}
        </Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={[styles.countdownTimer, { color: urgentColor }]}>
            {isOverdue ? "NOW" : formatCountdown(remaining)}
          </Text>
        </Animated.View>
        <Text style={[styles.countdownSub, { color: "rgba(255,255,255,0.4)" }]}>
          Every {activeCheckIn.intervalMinutes} minutes
        </Text>
      </View>

      {/* Safe button */}
      <TouchableOpacity
        onPress={confirmSafe}
        style={[styles.safeButton, { backgroundColor: colors.safe }]}
        activeOpacity={0.85}
      >
        <Feather name="check-circle" size={24} color="#FFFFFF" />
        <Text style={styles.safeButtonText}>I'm Safe</Text>
      </TouchableOpacity>

      {isOverdue && (
        <Text style={[styles.overdueNote, { color: colors.warning }]}>
          Your check-in was missed. Tap "I'm Safe" to reset.
        </Text>
      )}

      <View style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.08)" }]} />

      {/* Trusted contacts */}
      {activeCheckIn.trustedContacts.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.contactsLabel}>Trusted contacts</Text>
          {activeCheckIn.trustedContacts.map((c) => (
            <View key={c.id} style={[styles.contactRow, { borderColor: "rgba(255,255,255,0.1)" }]}>
              <View style={[styles.contactAvatar, { backgroundColor: colors.primary + "40" }]}>
                <Text style={[styles.contactInitial, { color: colors.primary }]}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.contactName}>{c.name}</Text>
              {c.phone ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  style={[styles.callBtn, { backgroundColor: colors.safe + "20", borderColor: colors.safe + "40" }]}
                >
                  <Feather name="phone" size={14} color={colors.safe} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Panic / Exit Assist */}
      {!panicMode ? (
        <TouchableOpacity
          onPress={handlePanic}
          style={[styles.panicButton, { backgroundColor: colors.danger + "20", borderColor: colors.danger + "40" }]}
        >
          <Feather name="alert-octagon" size={20} color={colors.danger} />
          <Text style={[styles.panicButtonText, { color: colors.danger }]}>Panic / Exit Assist</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.panicPanel, { borderColor: colors.danger + "50", backgroundColor: colors.danger + "15" }]}>
          <View style={styles.panicHeader}>
            <Feather name="alert-octagon" size={18} color={colors.danger} />
            <Text style={[styles.panicTitle, { color: colors.danger }]}>Exit Assist</Text>
            <TouchableOpacity onPress={() => setPanicMode(false)}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={sendSOS}
            style={[styles.panicAction, { backgroundColor: colors.danger }]}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
            <Text style={styles.panicActionText}>Send SOS to contacts</Text>
          </TouchableOpacity>

          {/* Get me home — Uber / Lyft */}
          <View style={styles.rideRow}>
            <TouchableOpacity
              onPress={async () => {
                if (!settings.homeLat || !settings.homeLng) {
                  router.push("/settings");
                  return;
                }
                await callUber({
                  pickupLat: location?.lat ?? activeCheckIn.lastLocation?.lat,
                  pickupLng: location?.lng ?? activeCheckIn.lastLocation?.lng,
                  dropoffLat: settings.homeLat,
                  dropoffLng: settings.homeLng,
                  dropoffName: "Home",
                  dropoffAddress: settings.homeAddress,
                });
              }}
              style={[styles.rideBtn, { backgroundColor: "#000000", flex: 1 }]}
              activeOpacity={0.85}
            >
              <Feather name="navigation" size={15} color="#FFFFFF" />
              <Text style={styles.rideBtnText}>Uber home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (!settings.homeLat || !settings.homeLng) {
                  router.push("/settings");
                  return;
                }
                await callLyft({
                  pickupLat: location?.lat ?? activeCheckIn.lastLocation?.lat,
                  pickupLng: location?.lng ?? activeCheckIn.lastLocation?.lng,
                  dropoffLat: settings.homeLat,
                  dropoffLng: settings.homeLng,
                });
              }}
              style={[styles.rideBtn, { backgroundColor: "#FF00BF" }]}
              activeOpacity={0.85}
            >
              <Feather name="zap" size={15} color="#FFFFFF" />
              <Text style={styles.rideBtnText}>Lyft</Text>
            </TouchableOpacity>
          </View>
          {!settings.homeLat && (
            <TouchableOpacity onPress={() => router.push("/settings")}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: -4, marginBottom: 4 }}>
                Set home address in Settings to enable rides
              </Text>
            </TouchableOpacity>
          )}

          {/* Fake call button — prominent in panic panel */}
          <TouchableOpacity
            onPress={() => router.push("/setup-fake-call")}
            style={[styles.panicSecondary, { borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(124,58,237,0.25)" }]}
          >
            <Feather name="phone-incoming" size={16} color="#C4B5FD" />
            <View style={styles.panicSecondaryText}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#C4B5FD" }}>
                Fake incoming call
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                Gives you a reason to leave
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          {mapsUrl && (
            <TouchableOpacity
              onPress={() => {
                const shareText = `I need you to know my location: ${locationText} — ${mapsUrl}`;
                const phones = activeCheckIn.trustedContacts.map((c) => c.phone).filter(Boolean).join(",");
                if (phones) {
                  const encoded = encodeURIComponent(shareText);
                  const smsUrl =
                    Platform.OS === "ios"
                      ? `sms:/open?addresses=${phones}&body=${encoded}`
                      : `sms:${phones}?body=${encoded}`;
                  Linking.openURL(smsUrl);
                } else {
                  Linking.openURL(mapsUrl);
                }
              }}
              style={[styles.panicSecondary, { borderColor: "rgba(255,255,255,0.15)" }]}
            >
              <Feather name="map-pin" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={[styles.panicSecondaryLabel]}>Share my location</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => Linking.openURL("tel:911")}
            style={[styles.panicSecondary, { borderColor: "rgba(255,255,255,0.15)" }]}
          >
            <Feather name="phone-call" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.panicSecondaryLabel}>Call emergency services</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const phones = activeCheckIn.trustedContacts.map((c) => c.phone).filter(Boolean);
              if (phones.length > 0) Linking.openURL(`tel:${phones[0]}`);
            }}
            disabled={activeCheckIn.trustedContacts.filter((c) => c.phone).length === 0}
            style={[styles.panicSecondary, { borderColor: "rgba(255,255,255,0.15)" }]}
          >
            <Feather name="phone" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.panicSecondaryLabel}>Call trusted contact</Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === "web" && (
        <View style={[styles.webNotice, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }]}>
          <Feather name="smartphone" size={14} color={colors.warning} />
          <Text style={[styles.webNoticeText, { color: colors.warning }]}>
            GPS tracking and push notifications are available in the Expo Go app on your phone.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  headerActive: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  endDateText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
  personSection: { alignItems: "center", marginBottom: 24 },
  personName: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  elapsedText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 32,
  },
  locationLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  locationIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  locationTextWrap: { flex: 1 },
  locationLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationAddress: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  countdownSection: { alignItems: "center", marginBottom: 32 },
  countdownLabel: { fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  countdownTimer: { fontSize: 72, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  countdownSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  safeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  safeButtonText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  overdueNote: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, marginTop: -4 },
  divider: { height: 1, marginVertical: 24 },
  contactsSection: { marginBottom: 20 },
  contactsLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  contactAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  contactInitial: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  callBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  panicButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    marginBottom: 8,
  },
  panicButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  panicPanel: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10, marginBottom: 8 },
  rideRow: { flexDirection: "row", gap: 8 },
  rideBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rideBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  panicHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  panicTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  panicAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 16,
  },
  panicActionText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  panicSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  panicSecondaryText: { flex: 1 },
  panicSecondaryLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  webNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  webNoticeText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
