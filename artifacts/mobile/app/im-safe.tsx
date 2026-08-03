import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ImSafeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trustedContacts } = useApp();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <LinearGradient colors={["#022C22", "#064E3B", "#022C22"]} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 + 40 : insets.top + 40, paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 30 }]}>
        {/* Big check */}
        <View style={styles.checkWrap}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={52} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>You're home safe 💜</Text>
        <Text style={styles.sub}>
          {trustedContacts.length > 0
            ? `We've let your ${trustedContacts.length > 1 ? `${trustedContacts.length} trusted contacts` : "trusted contact"} know you made it home.`
            : "You made it home. Next time, add trusted contacts so they know you're safe too."}
        </Text>

        {/* What was logged */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Feather name="shield" size={15} color="#34D399" />
            <Text style={styles.cardText}>Check-in ended</Text>
          </View>
          {trustedContacts.length > 0 && (
            <View style={styles.cardRow}>
              <Feather name="send" size={15} color="#34D399" />
              <Text style={styles.cardText}>
                All-clear sent to {trustedContacts.length > 1 ? `${trustedContacts.length} contacts` : trustedContacts[0]?.name}
              </Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Feather name="clock" size={15} color="#34D399" />
            <Text style={styles.cardText}>Safe arrival at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        </View>

        <Text style={styles.reflectPrompt}>
          How did the date go? Record a quick reflection while it's fresh.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/reflect")}
            style={styles.reflectBtn}
            activeOpacity={0.85}
          >
            <Feather name="heart" size={18} color="#FFFFFF" />
            <Text style={styles.reflectBtnText}>Add a reflection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={styles.homeBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 20 },

  checkWrap: { alignItems: "center", marginBottom: 8 },
  checkCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", shadowColor: "#059669", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },

  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  sub: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 24 },

  card: { backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 18, padding: 18, gap: 14, width: "100%", borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#34D399" },

  reflectPrompt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 21 },

  buttons: { gap: 10, width: "100%" },
  reflectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#059669", borderRadius: 18, paddingVertical: 16, shadowColor: "#059669", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  reflectBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  homeBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  homeBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
});
