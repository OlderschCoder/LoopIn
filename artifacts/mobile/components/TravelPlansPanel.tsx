import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTravel } from "@/context/TravelContext";
import { useColors } from "@/hooks/useColors";
import { presentTravelPaywall, restoreTravelPurchases } from "@/lib/purchases";

export function PlanKindToggle({ value, onChange, showDates = true }: { value: "dates" | "trips"; onChange: (value: "dates" | "trips") => void; showDates?: boolean }) {
  const colors = useColors();
  if (!showDates) return null;
  return (
    <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {(["dates", "trips"] as const).map((item) => (
        <TouchableOpacity key={item} onPress={() => onChange(item)} style={[styles.toggleOption, value === item && { backgroundColor: colors.primary }]}>
          <Feather name={item === "dates" ? "heart" : "map"} size={14} color={value === item ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.toggleText, { color: value === item ? colors.primaryForeground : colors.mutedForeground }]}>{item === "dates" ? "Dates" : "Trips"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TravelPlansPanel({ onShowDates }: { onShowDates: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const { trips, entitlements, loading, error, refresh } = useTravel();
  const [purchasing, setPurchasing] = useState(false);
  const topPadding = Platform.OS === "web" ? 83 : insets.top + 16;

  async function openPaywall(restore = false) {
    if (!userId) return;
    setPurchasing(true);
    try {
      if (restore) await restoreTravelPurchases(userId);
      else await presentTravelPaywall(userId);
      await refresh();
    } catch (cause) {
      Alert.alert("Travel subscription", cause instanceof Error ? cause.message : "Purchase could not be completed");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 90 }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>LOOPIN TRAVEL</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Trip Plans</Text>
        </View>
        {entitlements?.canCreateTrips && (
          <TouchableOpacity onPress={() => router.push("/travel/new")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>
      <PlanKindToggle value="trips" onChange={(value) => value === "dates" && onShowDates()} showDates={entitlements?.coreAccess !== false} />

      {!entitlements?.travelAccess ? (
        <View style={[styles.upsell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.upsellIcon, { backgroundColor: colors.primary + "18" }]}><Feather name="globe" size={26} color={colors.primary} /></View>
          <Text style={[styles.upsellTitle, { color: colors.foreground }]}>Safety that travels with you</Text>
          <Text style={[styles.upsellText, { color: colors.mutedForeground }]}>Build a live itinerary, schedule arrival check-ins, alert a dedicated Travel group, and protect emergency documents.</Text>
          <TouchableOpacity disabled={purchasing} onPress={() => openPaywall(false)} style={[styles.purchaseBtn, { backgroundColor: colors.primary }]}>
            {purchasing ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.purchaseText, { color: colors.primaryForeground }]}>View Travel plans</Text>}
          </TouchableOpacity>
          <TouchableOpacity disabled={purchasing} onPress={() => openPaywall(true)}><Text style={[styles.restoreText, { color: colors.primary }]}>Restore purchase</Text></TouchableOpacity>
        </View>
      ) : loading && trips.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : trips.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="map" size={34} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add flights, hotels, ground travel, contacts, and safety checkpoints in one timeline.</Text>
          {entitlements.canCreateTrips && <TouchableOpacity onPress={() => router.push("/travel/new")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Plan a trip</Text></TouchableOpacity>}
        </View>
      ) : (
        <>
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          {!entitlements.canCreateTrips && <Text style={[styles.error, { color: colors.mutedForeground }]}>Your subscription ended. Existing trips remain available, but creating a new trip requires renewed Travel access.</Text>}
          {trips.map((trip) => {
            const expected = trip.nextCheckpoint ? new Date(trip.nextCheckpoint.dueAt) : null;
            return (
              <TouchableOpacity key={trip.id} onPress={() => router.push(`/travel/${trip.id}`)} style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.tripTop}>
                  <View style={[styles.tripIcon, { backgroundColor: colors.primary + "18" }]}><Feather name="navigation" size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tripName, { color: colors.foreground }]}>{trip.name}</Text>
                    <Text style={[styles.destination, { color: colors.mutedForeground }]}>{trip.destination}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: trip.status === "active" ? colors.safe + "18" : colors.primary + "12" }]}>
                    <Text style={[styles.statusText, { color: trip.status === "active" ? colors.safe : colors.primary }]}>{trip.status}</Text>
                  </View>
                </View>
                <View style={[styles.nextRow, { borderTopColor: colors.border }]}>
                  <Feather name="clock" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.nextText, { color: colors.mutedForeground }]}>{trip.nextCheckpoint ? `${trip.nextCheckpoint.title} · ${expected?.toLocaleString()}` : "No upcoming checkpoint"}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { paddingHorizontal: 20 }, headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginBottom: 3 }, title: { fontSize: 26, fontFamily: "Inter_700Bold" }, addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  toggle: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20 }, toggleOption: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 9, borderRadius: 10 }, toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  upsell: { borderWidth: 1, borderRadius: 22, padding: 24, alignItems: "center", marginTop: 10 }, upsellIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 }, upsellTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 }, upsellText: { fontSize: 14, lineHeight: 21, textAlign: "center", fontFamily: "Inter_400Regular" }, purchaseBtn: { width: "100%", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 }, purchaseText: { fontSize: 16, fontFamily: "Inter_600SemiBold" }, restoreText: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 14 },
  empty: { alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 30, marginTop: 8 }, emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 10 }, emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 5 }, emptyBtn: { borderRadius: 20, paddingHorizontal: 22, paddingVertical: 11, marginTop: 16 },
  error: { fontSize: 13, marginBottom: 10 }, tripCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12 }, tripTop: { flexDirection: "row", alignItems: "center", gap: 11 }, tripIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, tripName: { fontSize: 16, fontFamily: "Inter_600SemiBold" }, destination: { fontSize: 13, marginTop: 2 }, statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, statusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" }, nextRow: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, marginTop: 13, paddingTop: 12 }, nextText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});
