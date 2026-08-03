import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

const FEELINGS = [
  { label: "Safe", icon: "shield" as const, positive: true },
  { label: "Heard", icon: "mic" as const, positive: true },
  { label: "Respected", icon: "award" as const, positive: true },
  { label: "Attracted", icon: "heart" as const, positive: true },
  { label: "Comfortable", icon: "sun" as const, positive: true },
  { label: "Valued", icon: "star" as const, positive: true },
  { label: "Pressured", icon: "alert-triangle" as const, positive: false },
  { label: "Confused", icon: "help-circle" as const, positive: false },
  { label: "Rushed", icon: "clock" as const, positive: false },
  { label: "Dismissed", icon: "x-circle" as const, positive: false },
  { label: "Uncomfortable", icon: "cloud" as const, positive: false },
  { label: "Anxious", icon: "activity" as const, positive: false },
];

const RATING_LABELS = ["", "Not good", "Okay", "Alright", "Good", "Great"];

export default function ReflectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reflections, addReflection } = useApp();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [personName, setPersonName] = useState("");
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [wouldSeeAgain, setWouldSeeAgain] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  function toggleFeeling(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFeelings((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  }

  function handleSave() {
    if (!personName.trim()) return;
    addReflection({
      personName: personName.trim(),
      dateAt: new Date().toISOString(),
      feelings: selectedFeelings,
      rating,
      wouldSeeAgain,
      notes,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => {
      setMode("list");
      setPersonName("");
      setSelectedFeelings([]);
      setRating(3);
      setWouldSeeAgain(null);
      setNotes("");
      setSaved(false);
    }, 1200);
  }

  function patternSummary() {
    const allFeelings = reflections.flatMap((r) => r.feelings);
    const counts: Record<string, number> = {};
    for (const f of allFeelings) counts[f] = (counts[f] ?? 0) + 1;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f]) => f);
    return top;
  }

  if (mode === "new") {
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMode("list")}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Post-Date Reflection
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>
          Who did you meet?
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Their name or nickname..."
            placeholderTextColor={colors.mutedForeground}
            value={personName}
            onChangeText={setPersonName}
          />
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>
          How did you feel?
        </Text>
        <View style={styles.feelingsGrid}>
          {FEELINGS.map((f) => {
            const selected = selectedFeelings.includes(f.label);
            const color = f.positive ? colors.safe : colors.warning;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => toggleFeeling(f.label)}
                style={[
                  styles.feelingChip,
                  {
                    backgroundColor: selected ? color + "20" : colors.surface,
                    borderColor: selected ? color : colors.border,
                  },
                ]}
              >
                <Feather name={f.icon} size={13} color={selected ? color : colors.mutedForeground} />
                <Text style={[styles.feelingText, { color: selected ? color : colors.mutedForeground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>
          Overall rating
        </Text>
        <View style={styles.ratingRow}>
          {([1, 2, 3, 4, 5] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => {
                setRating(r);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.ratingBtn,
                {
                  backgroundColor: rating >= r ? colors.primary : colors.surface,
                  borderColor: rating >= r ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name="star"
                size={18}
                color={rating >= r ? colors.primaryForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>
          {RATING_LABELS[rating]}
        </Text>

        <Text style={[styles.label, { color: colors.foreground }]}>
          Would you see them again?
        </Text>
        <View style={styles.yesNoRow}>
          {[true, false].map((val) => (
            <TouchableOpacity
              key={String(val)}
              onPress={() => {
                setWouldSeeAgain(val);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.yesNoBtn,
                {
                  backgroundColor:
                    wouldSeeAgain === val ? colors.primary : colors.surface,
                  borderColor:
                    wouldSeeAgain === val ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.yesNoText,
                  {
                    color:
                      wouldSeeAgain === val
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {val ? "Yes" : "No"}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setWouldSeeAgain(null)}
            style={[
              styles.yesNoBtn,
              {
                backgroundColor:
                  wouldSeeAgain === null ? colors.surface : colors.surface,
                borderColor:
                  wouldSeeAgain === null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.yesNoText, { color: colors.mutedForeground }]}>
              Unsure
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>
          Any notes?
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 100 }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="What stood out? Anything you want to remember..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!personName.trim() || saved}
          style={[
            styles.saveBtn,
            {
              backgroundColor: saved ? colors.safe : (personName.trim() ? colors.primary : colors.border),
            },
          ]}
        >
          <Feather
            name={saved ? "check" : "save"}
            size={18}
            color={saved || personName.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.saveBtnText,
              {
                color: saved || personName.trim() ? colors.primaryForeground : colors.mutedForeground,
              },
            ]}
          >
            {saved ? "Saved" : "Save reflection"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const topFeelings = patternSummary();

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
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Reflect</Text>
        <TouchableOpacity
          onPress={() => setMode("new")}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {reflections.length > 0 && topFeelings.length > 0 && (
        <View style={[styles.patternCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.patternHeader}>
            <Feather name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.patternTitle, { color: colors.primary }]}>
              Your patterns
            </Text>
          </View>
          <Text style={[styles.patternText, { color: colors.foreground }]}>
            You most often feel:{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>
              {topFeelings.join(", ")}
            </Text>
          </Text>
          <Text style={[styles.patternSub, { color: colors.mutedForeground }]}>
            Based on {reflections.length} reflection{reflections.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {reflections.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="heart" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No reflections yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            After a date, take a moment to record how you felt. Over time, you'll start to see your patterns.
          </Text>
          <TouchableOpacity
            onPress={() => setMode("new")}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
              Add first reflection
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        reflections.map((r) => {
          const avg = r.rating;
          return (
            <View
              key={r.id}
              style={[styles.reflectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.reflectionHeader}>
                <Text style={[styles.reflectionName, { color: colors.foreground }]}>
                  {r.personName}
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Feather
                      key={s}
                      name="star"
                      size={13}
                      color={avg >= s ? colors.warning : colors.border}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.reflectionDate, { color: colors.mutedForeground }]}>
                {new Date(r.dateAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              {r.feelings.length > 0 && (
                <View style={styles.reflectionFeelings}>
                  {r.feelings.slice(0, 4).map((f) => (
                    <View
                      key={f}
                      style={[styles.feelingTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.feelingTagText, { color: colors.foreground }]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                  {r.feelings.length > 4 && (
                    <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                      +{r.feelings.length - 4}
                    </Text>
                  )}
                </View>
              )}
              {r.notes.length > 0 && (
                <Text style={[styles.reflectionNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {r.notes}
                </Text>
              )}
            </View>
          );
        })
      )}
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
    marginBottom: 18,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    marginTop: 18,
  },
  inputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  feelingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feelingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  feelingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    marginBottom: 4,
  },
  yesNoRow: { flexDirection: "row", gap: 10 },
  yesNoBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  yesNoText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  patternCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    gap: 6,
  },
  patternHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  patternTitle: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  patternText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  patternSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reflectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  reflectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reflectionName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  starsRow: { flexDirection: "row", gap: 2 },
  reflectionDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reflectionFeelings: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  feelingTag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  feelingTagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  moreText: { fontSize: 12, fontFamily: "Inter_400Regular", alignSelf: "center" },
  reflectionNotes: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
