import { Feather } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const BAR_COUNT = 32;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addRecording } = useApp();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [permission, setPermission] = useState<boolean | null>(null);
  const [finishedUri, setFinishedUri] = useState<string | null>(null);
  const [finishedDuration, setFinishedDuration] = useState(0);
  const [label, setLabel] = useState("");
  const [personName, setPersonName] = useState("");
  const [saving, setSaving] = useState(false);

  const isRecording = recorderState.isRecording;
  const durationSec = (recorderState.durationMillis ?? 0) / 1000;

  // animated values
  const pulse = useRef(new Animated.Value(0)).current;
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermission(status.granted);
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      } catch {}
    })();
  }, []);

  // pulse animation for the record button glow
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [isRecording, pulse]);

  // waveform animation
  useEffect(() => {
    if (!isRecording) {
      bars.forEach((b) => {
        b.stopAnimation();
        Animated.timing(b, { toValue: 0.15, duration: 200, useNativeDriver: false }).start();
      });
      return;
    }
    const interval = setInterval(() => {
      const animations = bars.map((b) =>
        Animated.timing(b, {
          toValue: 0.2 + Math.random() * 0.8,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        })
      );
      Animated.parallel(animations).start();
    }, 230);
    return () => clearInterval(interval);
  }, [isRecording, bars]);

  async function handleStart() {
    if (permission === false) {
      Alert.alert(
        "Microphone needed",
        "Allow microphone access in your device settings to record."
      );
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("Couldn't start", "Recording isn't available on this device or browser.");
    }
  }

  async function handleStop() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const captured = durationSec;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert("Nothing recorded", "The recording was empty.");
        return;
      }
      let finalUri = uri;
      if (Platform.OS !== "web") {
        try {
          const dir = new Directory(Paths.document, "recordings");
          if (!dir.exists) dir.create();
          const ext = uri.split(".").pop()?.split("?")[0] || "m4a";
          const dest = new File(dir, `${Date.now()}.${ext}`);
          const src = new File(uri);
          src.copy(dest);
          finalUri = dest.uri;
        } catch {
          finalUri = uri;
        }
      }
      setFinishedUri(finalUri);
      setFinishedDuration(captured);
    } catch {
      Alert.alert("Couldn't stop", "Something went wrong saving the recording.");
    }
  }

  function handleSave() {
    if (!finishedUri) return;
    setSaving(true);
    addRecording({
      uri: finishedUri,
      label: label.trim() || "Date recording",
      personName: personName.trim() || undefined,
      durationSec: Math.round(finishedDuration),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/recordings");
  }

  function handleDiscard() {
    setFinishedUri(null);
    setFinishedDuration(0);
    setLabel("");
    setPersonName("");
  }

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const showSaveForm = finishedUri && !isRecording;

  return (
    <View style={{ flex: 1, backgroundColor: "#070110" }}>
      <LinearGradient
        colors={["#0A0118", "#1A0833", "#0A0118"]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(34,211,238,0.10)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.liveDot} />
          <Text style={styles.headerTitle}>Record Date</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/recordings")} style={styles.iconBtn}>
          <Feather name="folder" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      {!showSaveForm ? (
        <View style={styles.body}>
          {/* Privacy chip */}
          <View style={styles.privacyChip}>
            <Feather name="lock" size={12} color="#22D3EE" />
            <Text style={styles.privacyText}>Saved only on your device</Text>
          </View>

          {/* Waveform */}
          <View style={styles.waveform}>
            {bars.map((b, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  {
                    transform: [
                      {
                        scaleY: b.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.08, 1],
                        }),
                      },
                    ],
                    opacity: isRecording ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>

          {/* Timer */}
          <Text style={styles.timer}>{formatTime(durationSec)}</Text>
          <Text style={styles.timerLabel}>
            {isRecording ? "Recording…" : "Tap to start recording"}
          </Text>

          {/* Record button */}
          <View style={styles.recordWrap}>
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [
                    { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) },
                  ],
                },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={isRecording ? handleStop : handleStart}
              style={styles.recordBtnOuter}
            >
              <LinearGradient
                colors={isRecording ? ["#F87171", "#EF4444"] : ["#FB7185", "#E11D48"]}
                style={styles.recordBtnInner}
              >
                {isRecording ? (
                  <View style={styles.stopSquare} />
                ) : (
                  <Feather name="mic" size={36} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {Platform.OS === "web" ? (
            <Text style={styles.warnText}>
              Recording works best in the LoopIn mobile app.
            </Text>
          ) : (
            permission === false && (
              <Text style={styles.warnText}>
                Microphone access is blocked. Enable it in settings to record.
              </Text>
            )
          )}
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.savedIconWrap}>
            <LinearGradient colors={["#22D3EE", "#06B6D4"]} style={styles.savedIcon}>
              <Feather name="check" size={32} color="#04121A" />
            </LinearGradient>
          </View>
          <Text style={styles.savedTitle}>Recording captured</Text>
          <Text style={styles.savedDuration}>{formatTime(finishedDuration)}</Text>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. First date with Alex"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={label}
              onChangeText={setLabel}
            />
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Person (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Their name"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={personName}
              onChangeText={setPersonName}
            />
          </View>

          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            <LinearGradient
              colors={["#22D3EE", "#06B6D4"]}
              style={styles.saveBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="lock" size={16} color="#04121A" />
              <Text style={styles.saveBtnText}>Save to Locker</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  privacyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,211,238,0.10)",
    borderColor: "rgba(34,211,238,0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 40,
  },
  privacyText: { color: "#7DE9F7", fontSize: 12, fontFamily: "Inter_500Medium" },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 90,
    gap: 4,
    marginBottom: 24,
  },
  bar: {
    width: 4,
    height: 70,
    borderRadius: 2,
    backgroundColor: "#22D3EE",
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 48,
  },
  recordWrap: { alignItems: "center", justifyContent: "center" },
  glowRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#EF4444",
  },
  recordBtnOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  recordBtnInner: {
    flex: 1,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#FFFFFF" },
  warnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 20,
  },
  savedIconWrap: { marginBottom: 18 },
  savedIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  savedTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold" },
  savedDuration: {
    color: "#22D3EE",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginBottom: 28,
    fontVariant: ["tabular-nums"],
  },
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: { width: "100%", marginTop: 22 },
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { color: "#04121A", fontSize: 16, fontFamily: "Inter_700Bold" },
  discardBtn: { marginTop: 14, paddingVertical: 10 },
  discardText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "Inter_500Medium" },
});
