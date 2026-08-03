import { Feather } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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

import type { DateRecording } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RecordingRow({
  rec,
  isActive,
  onPlay,
  onStop,
  onDelete,
}: {
  rec: DateRecording;
  isActive: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={isActive ? onStop : onPlay}
        activeOpacity={0.85}
        style={styles.playBtn}
      >
        <LinearGradient
          colors={isActive ? ["#F87171", "#EF4444"] : ["#22D3EE", "#06B6D4"]}
          style={styles.playGrad}
        >
          <Feather name={isActive ? "square" : "play"} size={18} color="#04121A" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {rec.label}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {rec.personName ? `${rec.personName} · ` : ""}
          {new Date(rec.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          · {formatTime(rec.durationSec)}
        </Text>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={10}>
        <Feather name="trash-2" size={17} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </View>
  );
}

export default function RecordingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordings, deleteRecording } = useApp();

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // auto-clear active when playback finishes
  useEffect(() => {
    if (status.didJustFinish) {
      setActiveId(null);
    }
  }, [status.didJustFinish]);

  async function play(rec: DateRecording) {
    try {
      await Haptics.selectionAsync();
      if (Platform.OS !== "web") {
        const file = new File(rec.uri);
        if (!file.exists) {
          Alert.alert("File unavailable", "This recording's audio file is missing.");
          return;
        }
      }
      player.replace({ uri: rec.uri });
      player.seekTo(0);
      player.play();
      setActiveId(rec.id);
    } catch {
      Alert.alert("Can't play", "This recording could not be played.");
    }
  }

  function stop() {
    try {
      player.pause();
    } catch {}
    setActiveId(null);
  }

  function confirmDelete(rec: DateRecording) {
    Alert.alert("Delete recording", `Remove "${rec.label}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (activeId === rec.id) stop();
          if (Platform.OS !== "web") {
            try {
              const file = new File(rec.uri);
              if (file.exists) file.delete();
            } catch {}
          }
          deleteRecording(rec.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={{ flex: 1, backgroundColor: "#070110" }}>
      <LinearGradient colors={["#0A0118", "#160730", "#0A0118"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recordings</Text>
        <TouchableOpacity onPress={() => router.replace("/record")} style={styles.iconBtn}>
          <Feather name="plus" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.privacyChip}>
          <Feather name="lock" size={12} color="#22D3EE" />
          <Text style={styles.privacyText}>Encrypted on device · never uploaded</Text>
        </View>

        {recordings.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="mic" size={28} color="#22D3EE" />
            </View>
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyText}>
              Record audio during a date as private evidence. Only you can access it.
            </Text>
            <TouchableOpacity onPress={() => router.replace("/record")} style={styles.emptyBtn}>
              <LinearGradient
                colors={["#FB7185", "#E11D48"]}
                style={styles.emptyBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="mic" size={16} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Start a recording</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {recordings.map((rec) => (
              <RecordingRow
                key={rec.id}
                rec={rec}
                isActive={activeId === rec.id}
                onPlay={() => play(rec)}
                onStop={stop}
                onDelete={() => confirmDelete(rec)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  privacyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,211,238,0.10)",
    borderColor: "rgba(34,211,238,0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 18,
  },
  privacyText: { color: "#7DE9F7", fontSize: 12, fontFamily: "Inter_500Medium" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  playBtn: { width: 48, height: 48 },
  playGrad: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  deleteBtn: { padding: 6 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 20 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(34,211,238,0.10)",
    borderColor: "rgba(34,211,238,0.25)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  emptyBtn: { marginTop: 24 },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 26,
  },
  emptyBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
