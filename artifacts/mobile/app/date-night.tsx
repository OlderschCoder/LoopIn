import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "@/context/AppContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { callUber } from "@/utils/callRide";

const { width: SCREEN_W } = Dimensions.get("window");
const ALBUM_SIZE = Math.min(SCREEN_W - 48, 320);
const NUM_BARS = 28;

// ─── Animated waveform ──────────────────────────────────────────────────────
function AudioWaveform({ active, overdue }: { active: boolean; overdue: boolean }) {
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.15 + Math.random() * 0.3))
  ).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) => {
      const peak = overdue
        ? 0.5 + Math.random() * 0.5
        : active
        ? 0.25 + Math.random() * 0.65
        : 0.1 + Math.random() * 0.25;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: peak,
            duration: 280 + (i % 9) * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.05 + Math.random() * 0.15,
            duration: 200 + (i % 7) * 50,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    });
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [active, overdue]);

  const accentColor = overdue ? "#EF4444" : "#A78BFA";

  return (
    <View style={styles.waveform}>
      {barAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: anim.interpolate({ inputRange: [0, 1], outputRange: [3, ALBUM_SIZE * 0.55] }),
              backgroundColor: accentColor,
              opacity: 0.55 + (i % 4) * 0.1,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── PIN overlay ────────────────────────────────────────────────────────────
function PinOverlay({
  pin,
  input,
  onDigit,
  onBack,
  onCancel,
  shake,
  attempts,
}: {
  pin: string;
  input: string;
  onDigit: (d: string) => void;
  onBack: () => void;
  onCancel: () => void;
  shake: number;
  attempts: number;
}) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const KEYS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "⌫"],
  ];

  return (
    <View style={styles.pinOverlay}>
      <TouchableOpacity onPress={onCancel} style={styles.pinCancel}>
        <Text style={styles.pinCancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.pinTitle}>Unlock Night Sounds</Text>
      <Text style={styles.pinSub}>Enter your 6-digit code</Text>

      {/* Dots */}
      <Animated.View style={[styles.pinDots, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              { backgroundColor: i < input.length ? "#A78BFA" : "rgba(255,255,255,0.2)" },
            ]}
          />
        ))}
      </Animated.View>

      {attempts > 0 && attempts < 5 && (
        <Text style={styles.pinAttempts}>{5 - attempts} attempts remaining</Text>
      )}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => {
                  if (k === "") return;
                  if (k === "⌫") { onBack(); return; }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDigit(k);
                }}
                style={[styles.key, k === "" && { opacity: 0 }]}
                disabled={k === ""}
              >
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── SOS hold ring ───────────────────────────────────────────────────────────
function SOSButton({ onSOS }: { onSOS: () => void }) {
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdRef = useRef<ReturnType<typeof setTimeout>>();
  const hapticRef = useRef<ReturnType<typeof setInterval>>();
  const [holding, setHolding] = useState(false);

  function startHold() {
    setHolding(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, { toValue: 1, duration: 2800, useNativeDriver: false }).start();
    hapticRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 700);
    holdRef.current = setTimeout(() => {
      clearInterval(hapticRef.current);
      setHolding(false);
      holdAnim.setValue(0);
      onSOS();
    }, 2800);
  }

  function cancelHold() {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (hapticRef.current) clearInterval(hapticRef.current);
    setHolding(false);
    Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  const ringColor = holdAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(239,68,68,0)", "rgba(239,68,68,0.8)"] });

  return (
    <View style={styles.sosWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.sosRing, { backgroundColor: ringColor, borderRadius: 28 }]} />
      <TouchableWithoutFeedback onPressIn={startHold} onPressOut={cancelHold}>
        <View style={styles.controlBtn}>
          <Feather name={holding ? "alert-circle" : "heart"} size={22} color={holding ? "#EF4444" : "rgba(255,255,255,0.7)"} />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
const FAKE_QUEUE = [
  { title: "Quiet Hours", duration: "4:18" },
  { title: "City Lights", duration: "3:44" },
  { title: "Late Night Drive", duration: "5:12" },
  { title: "Neon Glow", duration: "3:57" },
];

function trackNameFor(remainingMs: number, intervalMs: number): string {
  if (remainingMs === 0) return "Signal Lost";
  const pct = remainingMs / intervalMs;
  if (pct > 0.6) return "Midnight Clarity";
  if (pct > 0.3) return "Golden Hour";
  return "Closing Time";
}

export default function DateNightScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, activeCheckIn, trustedContacts } = useApp();
  const { confirmSafe, sendSOS } = useCheckIn();

  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinShake, setPinShake] = useState(0);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [liked, setLiked] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  // Check-in countdown
  const [remaining, setRemaining] = useState(0);
  const intervalMs = (activeCheckIn?.intervalMinutes ?? 30) * 60 * 1000;

  useEffect(() => {
    if (!activeCheckIn) return;
    function update() {
      const r = Math.max(0, new Date(activeCheckIn!.nextCheckInAt).getTime() - Date.now());
      setRemaining(r);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeCheckIn]);

  // Intercept Android back
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowPin(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  // Triple-tap album art to reveal PIN
  function handleAlbumTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowPin(true);
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
    }
  }

  function handlePinDigit(d: string) {
    if (pinInput.length >= 6) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 6) {
      if (next === settings.dateNightPin) {
        // Correct — exit date night
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPinInput("");
        setShowPin(false);
        router.replace("/");
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        setPinShake((s) => s + 1);
        setTimeout(() => setPinInput(""), 500);
        // After 5 wrong attempts — unlock anyway for safety
        if (newAttempts >= 5) {
          setTimeout(() => {
            setPinInput("");
            setShowPin(false);
            router.replace("/");
          }, 600);
        }
      }
    }
  }

  function handlePinBack() {
    setPinInput((p) => p.slice(0, -1));
  }

  async function handleUber() {
    if (!settings.homeLat || !settings.homeLng) {
      setShowPin(true); // redirect to settings via unlock
      return;
    }
    await callUber({
      dropoffLat: settings.homeLat,
      dropoffLng: settings.homeLng,
      dropoffName: "Home",
      dropoffAddress: settings.homeAddress,
    });
  }

  function handleSOS() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    sendSOS();
  }

  function handleSafe() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confirmSafe();
  }

  const overdue = remaining === 0 && !!activeCheckIn;
  const progress = activeCheckIn ? 1 - remaining / intervalMs : 0;
  const trackName = activeCheckIn ? trackNameFor(remaining, intervalMs) : "Midnight Clarity";

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  // Format remaining as track time display (inverted — looks like track remaining)
  const totalSec = Math.floor(remaining / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const timeStr = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080812" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowPin(true)}>
          <Feather name="menu" size={22} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name="music" size={14} color="#A78BFA" style={{ marginRight: 5 }} />
          <Text style={styles.appName}>Night Sounds</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowPin(true)}>
          <Feather name="more-horizontal" size={22} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {/* Album art */}
      <View style={styles.albumWrap}>
        <TouchableOpacity onPress={handleAlbumTap} activeOpacity={1} style={[styles.album, { width: ALBUM_SIZE, height: ALBUM_SIZE }]}>
          <LinearGradient
            colors={overdue ? ["#1F0A0A", "#2D0808", "#0A0812"] : ["#150D26", "#1A1040", "#080812"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <AudioWaveform active={!overdue} overdue={overdue} />
          {overdue && (
            <View style={styles.overdueOverlay}>
              <Text style={styles.overdueText}>CONFIRM NOW</Text>
            </View>
          )}
          {/* Subtle triple-tap hint — only visible if you know to look */}
          <View style={styles.albumHint}>
            <Text style={styles.albumHintText}>···</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Track info */}
      <View style={styles.trackInfo}>
        <View style={styles.trackRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackName}>{trackName}</Text>
            <Text style={styles.trackArtist}>Evening Mix · Private  •  FLAC</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setLiked((l) => !l);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name="plus-circle" size={22} color={liked ? "#A78BFA" : "rgba(255,255,255,0.35)"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: overdue ? "#EF4444" : "#A78BFA" }]} />
          <View style={[styles.progressThumb, { left: `${Math.min(progress * 100, 100)}%`, backgroundColor: overdue ? "#EF4444" : "#A78BFA" }]} />
        </View>
        <View style={styles.progressTimes}>
          <Text style={styles.progressTime}>0:00</Text>
          <Text style={[styles.progressTime, { color: overdue ? "#EF4444" : "rgba(255,255,255,0.4)" }]}>
            {activeCheckIn ? timeStr : "30:00"}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* SOS — hold 3 seconds */}
        <SOSButton onSOS={handleSOS} />

        {/* Volume / prev (non-functional decoy) */}
        <TouchableOpacity style={styles.controlBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Feather name="skip-back" size={26} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* PLAY = I'm Safe */}
        <TouchableOpacity
          onPress={handleSafe}
          style={[styles.playBtn, { backgroundColor: overdue ? "#EF4444" : "#A78BFA" }]}
          activeOpacity={0.85}
        >
          <Feather name={overdue ? "check" : "play"} size={28} color="#FFFFFF" style={{ marginLeft: overdue ? 0 : 2 }} />
        </TouchableOpacity>

        {/* SKIP = Fake Call */}
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => router.push("/setup-fake-call")}
        >
          <Feather name="skip-forward" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* SHARE = Uber home */}
        <TouchableOpacity style={styles.controlBtn} onPress={handleUber}>
          <Feather name="share-2" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Up next queue */}
      <View style={styles.queue}>
        <View style={styles.queueHeader}>
          <Text style={styles.queueTitle}>Up Next</Text>
          <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Feather name="list" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>
        {FAKE_QUEUE.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={styles.queueRow}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.queueNum}>
              <Text style={styles.queueNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.queueTrack} numberOfLines={1}>{t.title}</Text>
            <Text style={styles.queueDur}>{t.duration}</Text>
            <Feather name="more-horizontal" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        ))}
      </View>

      {/* What the buttons actually do — invisible guide for user memory */}
      {Platform.OS === "web" && (
        <View style={styles.webGuide}>
          <Text style={styles.webGuideTitle}>Date Night Mode — buttons guide</Text>
          <Text style={styles.webGuideRow}>▶ Play → I'm Safe (confirm check-in)</Text>
          <Text style={styles.webGuideRow}>⏭ Skip → Fake Call</Text>
          <Text style={styles.webGuideRow}>↑ Share → Call Uber Home</Text>
          <Text style={styles.webGuideRow}>♡ Hold 3s → SOS alert</Text>
          <Text style={styles.webGuideRow}>Triple-tap album art → PIN unlock</Text>
        </View>
      )}

      {/* PIN overlay */}
      {showPin && (
        <PinOverlay
          pin={settings.dateNightPin ?? ""}
          input={pinInput}
          onDigit={handlePinDigit}
          onBack={handlePinBack}
          onCancel={() => { setShowPin(false); setPinInput(""); }}
          shake={pinShake}
          attempts={pinAttempts}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080812",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: { padding: 4 },
  headerCenter: { flexDirection: "row", alignItems: "center" },
  appName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  albumWrap: { marginTop: 8, marginBottom: 24 },
  album: {
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 16,
    height: "100%",
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 3,
  },
  overdueOverlay: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "rgba(239,68,68,0.3)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  overdueText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
    letterSpacing: 1.5,
  },
  albumHint: { position: "absolute", top: 10, right: 12 },
  albumHintText: { fontSize: 16, color: "rgba(255,255,255,0.06)", letterSpacing: 3 },
  trackInfo: { width: "100%", paddingHorizontal: 24, marginBottom: 16 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trackName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  trackArtist: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },
  progressSection: { width: "100%", paddingHorizontal: 24, marginBottom: 28 },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    marginBottom: 8,
    position: "relative",
    overflow: "visible",
  },
  progressFill: { height: 3, borderRadius: 2 },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    marginLeft: -5,
  },
  progressTimes: { flexDirection: "row", justifyContent: "space-between" },
  progressTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sosWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sosRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
  },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  queue: { width: "100%", paddingHorizontal: 24 },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  queueTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  queueNum: {
    width: 20,
    alignItems: "center",
  },
  queueNumText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
  },
  queueTrack: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  queueDur: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
  webGuide: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: "rgba(124,58,237,0.2)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
  },
  webGuideTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#C4B5FD",
    marginBottom: 4,
  },
  webGuideRow: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(196,181,253,0.7)",
    marginBottom: 2,
  },
  // PIN overlay
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,18,0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  pinCancel: { position: "absolute", top: 56, right: 24 },
  pinCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },
  pinTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  pinSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 36,
  },
  pinDots: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pinAttempts: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    marginBottom: 16,
    marginTop: 4,
  },
  keypad: { gap: 10, marginTop: 20 },
  keyRow: { flexDirection: "row", gap: 16 },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 26, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
});
