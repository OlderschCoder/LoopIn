import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  usePhone,
  formatPhone,
  type PhoneCall,
  type PhoneNumberRow,
} from "@/hooks/usePhone";

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phone = usePhone();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState<PhoneNumberRow | null>(null);
  const [calls, setCalls] = useState<PhoneCall[]>([]);
  const [dialNumber, setDialNumber] = useState("");

  const load = useCallback(async () => {
    try {
      const numRes = await phone.getNumber();
      setNumber(numRes.number);
      if (numRes.number) {
        const callRes = await phone.listCalls();
        setCalls(callRes.calls);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load calls.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleCall() {
    const to = dialNumber.trim();
    if (!to || calling) return;
    if (!number?.ownerRealPhone) {
      Alert.alert(
        "Add your phone number",
        "Add your real phone number in setup so we can connect your calls.",
        [{ text: "OK", onPress: () => router.push("/phone-setup") }],
      );
      return;
    }
    setCalling(true);
    try {
      await phone.startCall({ to });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDialNumber("");
      Alert.alert(
        "Connecting your call",
        "Your phone will ring shortly. Answer it, and we'll connect you through your private number. The call is recorded for your safety.",
      );
      load();
    } catch (e: any) {
      Alert.alert("Call failed", e?.message ?? "Could not start the call.");
    } finally {
      setCalling(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 24 : insets.top + 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Calls</Text>
        <TouchableOpacity onPress={() => router.push("/messages")} style={styles.iconBtn}>
          <Feather name="message-circle" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : !number ? (
        <View style={styles.center}>
          <Feather name="phone" size={32} color={colors.primary} />
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>
            Set up your private number first
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/phone-setup")}
            style={[styles.setupBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.setupBtnText, { color: colors.primaryForeground }]}>Set up now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={[styles.dialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dialLabel, { color: colors.foreground }]}>Make a private call</Text>
            <View style={styles.dialRow}>
              <View style={[styles.dialInputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.dialInput, { color: colors.foreground }]}
                  placeholder="Enter a number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  value={dialNumber}
                  onChangeText={setDialNumber}
                />
              </View>
              <TouchableOpacity
                onPress={handleCall}
                disabled={calling || !dialNumber.trim()}
                style={[styles.dialBtn, { backgroundColor: dialNumber.trim() ? colors.safe : colors.border }]}
              >
                {calling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="phone" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.dialHint, { color: colors.mutedForeground }]}>
              We'll ring your phone, then connect you. They see your private number, and
              the call is recorded for your safety.
            </Text>
          </View>

          {error && <Text style={[styles.errorText, { color: colors.sos }]}>{error}</Text>}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent calls</Text>
          {calls.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="phone-off" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No calls yet.
              </Text>
            </View>
          ) : (
            calls.map((c) => {
              const out = c.direction === "outbound";
              return (
                <View
                  key={c.id}
                  style={[styles.callRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.callIcon, { backgroundColor: out ? colors.primary + "18" : colors.safe + "18" }]}>
                    <Feather
                      name={out ? "phone-outgoing" : "phone-incoming"}
                      size={16}
                      color={out ? colors.primary : colors.safe}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.callName, { color: colors.foreground }]}>
                      {c.contactName || formatPhone(c.contactNumber)}
                    </Text>
                    <Text style={[styles.callMeta, { color: colors.mutedForeground }]}>
                      {out ? "Outgoing" : "Incoming"}
                      {c.status ? ` · ${c.status}` : ""}
                      {formatDuration(c.durationSec) ? ` · ${formatDuration(c.durationSec)}` : ""}
                    </Text>
                    <Text style={[styles.callDate, { color: colors.mutedForeground }]}>
                      {new Date(c.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {c.recordingSid && (
                    <View style={[styles.recBadge, { backgroundColor: colors.record + "18" }]}>
                      <Feather name="mic" size={12} color={colors.record} />
                      <Text style={[styles.recText, { color: colors.record }]}>Saved</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 26 },
  iconBtn: { width: 26, alignItems: "flex-end" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  setupTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  setupBtn: { paddingHorizontal: 26, paddingVertical: 12, borderRadius: 22 },
  setupBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dialCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 14, marginBottom: 18 },
  dialLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  dialRow: { flexDirection: "row", gap: 10 },
  dialInputBox: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: "center" },
  dialInput: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 12 },
  dialBtn: { width: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dialHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 17 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  empty: { alignItems: "center", gap: 8, padding: 28, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  callIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  callName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  callMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "capitalize" },
  callDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  recText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
