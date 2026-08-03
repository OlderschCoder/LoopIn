import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useColors } from "@/hooks/useColors";

const PLATFORM_COLORS: Record<string, string> = {
  tinder: "#FE3C72",
  hinge: "#E8472B",
  bumble: "#F5C518",
  okcupid: "#0072EF",
  other: "#6B7280",
};

type FilterTab = "upcoming" | "completed" | "all";

export default function PlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { datePlans, deleteDatePlan, matchProfiles } = useApp();
  const [filter, setFilter] = useState<FilterTab>("upcoming");

  const topPadding = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const filtered = datePlans.filter((p) => {
    if (filter === "upcoming") return p.status === "upcoming" || p.status === "active";
    if (filter === "completed") return p.status === "completed";
    return true;
  });

  function handleDelete(id: string, name: string) {
    Alert.alert(
      "Delete date plan",
      `Remove the date plan with ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteDatePlan(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
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
          <Text style={[styles.title, { color: colors.foreground }]}>Date Plans</Text>
          <TouchableOpacity
            onPress={() => router.push("/plan/new")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["upcoming", "completed", "all"] as FilterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[
                styles.filterTab,
                filter === tab && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === tab ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Stats */}
        {datePlans.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{datePlans.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total plans</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.safe }]}>
                {datePlans.filter((p) => p.safetyScore >= 75).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Safe rated</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.accent }]}>
                {datePlans.filter((p) => p.trustedContacts.length > 0).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>With contacts</Text>
            </View>
          </View>
        )}

        {/* Plans List */}
        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="calendar" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "upcoming" ? "No upcoming dates" : "No plans here"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Plan your next date with a safety check built in
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/plan/new")}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                Create plan
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((plan) => {
            const linkedMatch = matchProfiles.find((m) => m.datePlanId === plan.id);
            const platformColor = linkedMatch ? (PLATFORM_COLORS[linkedMatch.platform] ?? "#6B7280") : null;
            return (
              <View key={plan.id}>
                <DateCard plan={plan} />
                {/* Match profile chip */}
                {linkedMatch && (
                  <TouchableOpacity
                    onPress={() => router.push(`/match/${linkedMatch.id}`)}
                    style={[styles.matchChip, { backgroundColor: (platformColor ?? "#6B7280") + "12", borderColor: (platformColor ?? "#6B7280") + "35" }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.matchDot, { backgroundColor: platformColor ?? "#6B7280" }]} />
                    <Text style={[styles.matchChipText, { color: platformColor ?? "#6B7280" }]}>
                      {linkedMatch.platform.charAt(0).toUpperCase() + linkedMatch.platform.slice(1)} · {linkedMatch.username || "Match profile"}
                    </Text>
                    {linkedMatch.pastedConversation.trim() && (
                      <View style={[styles.chatBadge, { backgroundColor: (platformColor ?? "#6B7280") + "20" }]}>
                        <Feather name="message-square" size={10} color={platformColor ?? "#6B7280"} />
                        <Text style={[styles.chatBadgeText, { color: platformColor ?? "#6B7280" }]}>Chat saved</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={13} color={(platformColor ?? "#6B7280") + "90"} />
                  </TouchableOpacity>
                )}
                <View style={styles.planActions}>
                  <TouchableOpacity
                    onPress={() => handleDelete(plan.id, plan.personName)}
                    style={[styles.planActionBtn, { borderColor: colors.border }]}
                  >
                    <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.planActionText, { color: colors.mutedForeground }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                  {!linkedMatch && (
                    <TouchableOpacity
                      onPress={() => router.push("/(tabs)/ai")}
                      style={[styles.planActionBtn, { borderColor: colors.border }]}
                    >
                      <Feather name="shield" size={15} color={colors.primary} />
                      <Text style={[styles.planActionText, { color: colors.primary }]}>
                        Analyze
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/reflect")}
                    style={[styles.planActionBtn, { borderColor: colors.border }]}
                  >
                    <Feather name="heart" size={15} color={colors.accent} />
                    <Text style={[styles.planActionText, { color: colors.accent }]}>
                      Reflect
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  planActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: -6,
    marginBottom: 16,
  },
  planActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planActionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  matchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -10,
    marginBottom: 10,
  },
  matchDot: { width: 7, height: 7, borderRadius: 4 },
  matchChipText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  chatBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  chatBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
