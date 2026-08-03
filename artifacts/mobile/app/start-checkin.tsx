import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const INTERVALS = [
  { minutes: 15, label: "Every 15 min" },
  { minutes: 30, label: "Every 30 min" },
  { minutes: 60, label: "Every hour" },
  { minutes: 90, label: "Every 90 min" },
];

export default function StartCheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const { datePlans, trustedContacts: savedContacts } = useApp();
  const { startCheckIn } = useCheckIn();
  const { location, loading: locationLoading, fetchOnce } = useLocation();

  const plan = params.planId ? datePlans.find((p) => p.id === params.planId) : null;

  const [personName, setPersonNameState] = useState(plan?.personName ?? "");
  const [locationName, setLocationName] = useState(plan?.locationName ?? "");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [selectedContacts, setSelectedContacts] = useState(
    plan?.trustedContacts ?? []
  );
  const [starting, setStarting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (Platform.OS !== "web") fetchOnce();
  }, []);

  function toggleContact(id: string) {
    const contact = savedContacts.find((c) => c.id === id);
    if (!contact) return;
    setSelectedContacts((prev) =>
      prev.find((c) => c.id === id) ? prev.filter((c) => c.id !== id) : [...prev, contact]
    );
  }

  async function handleStart() {
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startCheckIn({
      personName: personName.trim() || "Unknown",
      locationName: locationName.trim() || "Unknown",
      intervalMinutes,
      trustedContacts: selectedContacts,
      lastLocation: location
        ? { lat: location.lat, lng: location.lng, address: location.address }
        : null,
    });
    router.replace("/checkin");
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: (Platform.OS === "web" ? topPad : topPad) + 12,
          paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Start Check-In</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your trusted contacts will be ready to receive an SOS if you miss a check-in. Push notifications will remind you.
      </Text>

      {/* Person */}
      <Text style={[styles.label, { color: colors.foreground }]}>Who are you meeting?</Text>
      <TouchableOpacity
        style={[styles.textField, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.textFieldValue, { color: personName ? colors.foreground : colors.mutedForeground }]}>
          {personName || "Enter a name..."}
        </Text>
      </TouchableOpacity>

      {/* Current location */}
      <Text style={[styles.label, { color: colors.foreground }]}>Your current location</Text>
      <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.locationIcon, { backgroundColor: colors.primary + "20" }]}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="map-pin" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.locationText, { color: location ? colors.foreground : colors.mutedForeground }]}>
          {Platform.OS === "web"
            ? "GPS not available in web preview"
            : locationLoading
            ? "Getting your location..."
            : location?.address ?? "Tap to get location"}
        </Text>
      </View>

      {/* Check-in interval */}
      <Text style={[styles.label, { color: colors.foreground }]}>Check-in every</Text>
      <View style={styles.intervalRow}>
        {INTERVALS.map((iv) => (
          <TouchableOpacity
            key={iv.minutes}
            onPress={() => {
              setIntervalMinutes(iv.minutes);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.intervalChip,
              {
                backgroundColor: intervalMinutes === iv.minutes ? colors.primary : colors.surface,
                borderColor: intervalMinutes === iv.minutes ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.intervalText,
                {
                  color:
                    intervalMinutes === iv.minutes
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {iv.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.intervalNote, { color: colors.mutedForeground }]}>
        If you miss a check-in, an escalation alert fires 5 minutes later and opens an SOS message to your contacts.
      </Text>

      {/* Trusted contacts */}
      <Text style={[styles.label, { color: colors.foreground }]}>Alert these contacts</Text>
      {savedContacts.length === 0 ? (
        <View style={[styles.noContacts, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.noContactsText, { color: colors.mutedForeground }]}>
            Add trusted contacts in your date plan first.
          </Text>
        </View>
      ) : (
        savedContacts.map((c) => {
          const selected = !!selectedContacts.find((x) => x.id === c.id);
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => toggleContact(c.id)}
              style={[
                styles.contactCard,
                {
                  backgroundColor: selected ? colors.primary + "10" : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={[styles.contactAvatar, { backgroundColor: selected ? colors.primary : colors.surface }]}>
                <Text style={[styles.contactInitial, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
                {c.phone && (
                  <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{c.phone}</Text>
                )}
              </View>
              {selected && <Feather name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
          );
        })
      )}

      {/* Start button */}
      <TouchableOpacity
        onPress={handleStart}
        disabled={starting}
        style={[styles.startBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        {starting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="shield" size={20} color={colors.primaryForeground} />
            <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
              Start check-in
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 20,
  },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  textField: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  textFieldValue: { fontSize: 15, fontFamily: "Inter_400Regular" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  intervalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  intervalChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  intervalText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  intervalNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 8,
  },
  noContacts: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  noContactsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 24,
  },
  startBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
});
