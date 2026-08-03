import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { DatePlan } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface DateCardProps {
  plan: DatePlan;
  onPress?: () => void;
}

function safetyColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 75) return colors.safe;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function safetyLabel(score: number) {
  if (score >= 75) return "Safe";
  if (score >= 50) return "Caution";
  return "Review";
}

const TRANSPORT_LABEL: Record<DatePlan["transport"], string> = {
  own: "Own transport",
  rideshare: "Rideshare",
  walk: "Walking",
  "date-drives": "Date driving",
  "public-transit": "Public transit",
};

const LOCATION_ICON: Record<DatePlan["locationType"], "map-pin" | "home" | "coffee"> = {
  public: "map-pin",
  "semi-public": "coffee",
  private: "home",
};

export default function DateCard({ plan, onPress }: DateCardProps) {
  const colors = useColors();
  const scoreColor = safetyColor(plan.safetyScore, colors);
  const dateObj = new Date(plan.dateTime);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={[styles.personName, { color: colors.foreground }]}>
            {plan.personName}
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "20", borderColor: scoreColor + "40" }]}>
            <View style={[styles.scoreDot, { backgroundColor: scoreColor }]} />
            <Text style={[styles.scoreText, { color: scoreColor }]}>
              {safetyLabel(plan.safetyScore)}
            </Text>
          </View>
        </View>
        <Text style={[styles.dateTime, { color: colors.mutedForeground }]}>
          {formattedDate} at {formattedTime}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name={LOCATION_ICON[plan.locationType]} size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {plan.locationName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="navigation" size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {TRANSPORT_LABEL[plan.transport]}
          </Text>
        </View>
        {plan.trustedContacts.length > 0 && (
          <View style={styles.detailRow}>
            <Feather name="users" size={13} color={colors.safe} />
            <Text style={[styles.detailText, { color: colors.safe }]}>
              {plan.trustedContacts.map((c) => c.name).join(", ")} notified
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${plan.safetyScore}%` as `${number}%`, backgroundColor: scoreColor },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  personName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dateTime: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  details: {
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  scoreBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 3,
    borderRadius: 2,
  },
});
