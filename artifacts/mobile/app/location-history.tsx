import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
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

import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import type { LocationPoint } from "@/lib/locationTask";

const theme = colors.light;

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

function PointRow({ point, isLatest }: { point: LocationPoint; isLatest: boolean }) {
  const coords = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  const mapsUrl = `https://maps.google.com/?q=${point.lat},${point.lng}`;
  return (
    <View style={styles.row}>
      <View style={styles.dotCol}>
        <View
          style={[
            styles.dot,
            { backgroundColor: isLatest ? theme.safe : theme.primary },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTime, { color: theme.foreground }]}>
          {formatTime(point.timestamp)}
          {isLatest ? "  ·  Latest" : ""}
        </Text>
        <Text style={[styles.rowCoords, { color: theme.mutedForeground }]}>
          {coords}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL(mapsUrl)}
        style={styles.mapBtn}
        activeOpacity={0.7}
      >
        <Feather name="map-pin" size={16} color={theme.primary} />
        <Text style={[styles.mapBtnText, { color: theme.primary }]}>Map</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LocationHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentLocation, locationHistory, settings } = useApp();

  const ordered = useMemo(
    () => [...locationHistory].sort((a, b) => b.timestamp - a.timestamp),
    [locationHistory]
  );

  const topPad = Platform.OS === "web" ? 24 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.foreground }]}>Location</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
        Your current location and recent history are saved to your account so you
        and your trusted circle can see where you've been.
      </Text>

      {Platform.OS === "web" ? (
        <View
          style={[styles.notice, { backgroundColor: theme.warningLight, borderColor: theme.warning + "40" }]}
        >
          <Feather name="info" size={18} color={theme.warning} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>
            GPS isn't available in the web preview. Open LoopIn on your phone
            to record and view your location history.
          </Text>
        </View>
      ) : !settings.gpsTrackingEnabled ? (
        <View
          style={[styles.notice, { backgroundColor: theme.warningLight, borderColor: theme.warning + "40" }]}
        >
          <Feather name="alert-triangle" size={18} color={theme.warning} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>
            GPS tracking is turned off. Turn it on in Setup & Safety to start
            saving your location to your account.
          </Text>
        </View>
      ) : null}

      {/* Current location */}
      <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>
        Current location
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {currentLocation ? (
          <PointRow point={currentLocation} isLatest />
        ) : (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>
            No location recorded yet.
          </Text>
        )}
      </View>

      {/* History */}
      <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>
        History {ordered.length > 0 ? `(${ordered.length})` : ""}
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {ordered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>
            Your location history will appear here as it's recorded.
          </Text>
        ) : (
          ordered.map((p, i) => (
            <PointRow key={`${p.timestamp}-${i}`} point={p} isLatest={i === 0} />
          ))
        )}
      </View>
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
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 16 },
  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  dotCol: { width: 14, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTime: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowCoords: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  mapBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  mapBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 18, textAlign: "center" },
});
