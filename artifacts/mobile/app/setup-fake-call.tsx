import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const DELAYS = [
  { label: "Now", seconds: 0 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

const PRESETS = ["Mom", "Dad", "Alex", "Sarah", "Jordan", "Doctor's office"];

export default function SetupFakeCallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scheduleFakeCall } = useApp();

  const [callerName, setCallerName] = useState("Mom");
  const [delaySeconds, setDelaySeconds] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleStart() {
    if (!callerName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scheduleFakeCall({
      callerName: callerName.trim(),
      triggerAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    });
    if (delaySeconds === 0) {
      router.replace("/fake-call");
    } else {
      router.back();
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 40,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Fake Call</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Triggers a realistic-looking incoming call on your screen. Use it to create a polite reason to leave.
      </Text>

      {/* Preview */}
      <View style={[styles.preview, { backgroundColor: "#0D0D1A" }]}>
        <View style={styles.previewAvatar}>
          <Text style={styles.previewInitial}>
            {(callerName.trim() || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.previewName}>{callerName.trim() || "Caller name"}</Text>
        <Text style={styles.previewSub}>Incoming call · Mobile</Text>
        <View style={styles.previewBtns}>
          <View style={[styles.previewBtn, { backgroundColor: "#EF4444" }]}>
            <Feather name="phone-off" size={18} color="#FFF" />
          </View>
          <View style={[styles.previewBtn, { backgroundColor: "#10B981" }]}>
            <Feather name="phone" size={18} color="#FFF" />
          </View>
        </View>
      </View>

      {/* Caller name */}
      <Text style={[styles.label, { color: colors.foreground }]}>Caller name</Text>
      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Enter a name..."
          placeholderTextColor={colors.mutedForeground}
          value={callerName}
          onChangeText={setCallerName}
        />
      </View>

      {/* Presets */}
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => {
              setCallerName(p);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.presetChip,
              {
                backgroundColor: callerName === p ? colors.primary : colors.surface,
                borderColor: callerName === p ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.presetText,
                { color: callerName === p ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Delay */}
      <Text style={[styles.label, { color: colors.foreground }]}>Delay</Text>
      <Text style={[styles.delayHint, { color: colors.mutedForeground }]}>
        Schedule it ahead so you can set your phone down naturally.
      </Text>
      <View style={styles.delays}>
        {DELAYS.map((d) => (
          <TouchableOpacity
            key={d.seconds}
            onPress={() => {
              setDelaySeconds(d.seconds);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.delayChip,
              {
                backgroundColor: delaySeconds === d.seconds ? colors.primary : colors.surface,
                borderColor: delaySeconds === d.seconds ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.delayText,
                { color: delaySeconds === d.seconds ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={handleStart}
        disabled={!callerName.trim()}
        style={[
          styles.startBtn,
          { backgroundColor: callerName.trim() ? colors.primary : colors.border },
        ]}
        activeOpacity={0.85}
      >
        <Feather
          name="phone-incoming"
          size={20}
          color={callerName.trim() ? colors.primaryForeground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.startBtnText,
            { color: callerName.trim() ? colors.primaryForeground : colors.mutedForeground },
          ]}
        >
          {delaySeconds === 0 ? "Call me now" : `Call me in ${DELAYS.find(d => d.seconds === delaySeconds)?.label}`}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.tip, { color: colors.mutedForeground }]}>
        If you set a delay, keep the app open. The call screen appears automatically when the timer runs out.
      </Text>
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
  preview: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  previewAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  previewInitial: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  previewName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  previewSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  previewBtns: {
    flexDirection: "row",
    gap: 32,
    marginTop: 16,
  },
  previewBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  inputBox: { borderRadius: 14, borderWidth: 1, padding: 14 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  presetChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  presetText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  delayHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
    lineHeight: 17,
  },
  delays: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  delayChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  delayText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 28,
    marginBottom: 14,
  },
  startBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tip: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    textAlign: "center",
  },
});
