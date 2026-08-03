import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type FlagType = "green" | "yellow" | "red";

interface FlagBadgeProps {
  type: FlagType;
  text: string;
}

const FLAG_CONFIG = {
  green: { icon: "check-circle" as const, label: "Good sign" },
  yellow: { icon: "alert-triangle" as const, label: "Note" },
  red: { icon: "alert-octagon" as const, label: "Red flag" },
};

export default function FlagBadge({ type, text }: FlagBadgeProps) {
  const colors = useColors();

  const colorMap = {
    green: colors.safe,
    yellow: colors.warning,
    red: colors.danger,
  };

  const color = colorMap[type];
  const { icon } = FLAG_CONFIG[type];

  return (
    <View style={[styles.container, { backgroundColor: color + "12", borderColor: color + "30" }]}>
      <Feather name={icon} size={14} color={color} style={styles.icon} />
      <Text style={[styles.text, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
});
