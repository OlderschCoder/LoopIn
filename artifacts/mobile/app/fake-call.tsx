import { Feather } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

type CallState = "incoming" | "active" | "ended";

function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.18, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function useRingPulse() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function useCallTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FakeCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fakeCall, clearFakeCall } = useApp();
  const [callState, setCallState] = useState<CallState>("incoming");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  const callerName = fakeCall?.callerName ?? "Mom";
  const initial = callerName.charAt(0).toUpperCase();
  const timerStr = useCallTimer(callState === "active");
  const pulse = usePulse();
  const ring = useRingPulse();

  // Ring out loud on incoming
  const ringtone = useAudioPlayer(
    Platform.OS !== "web" ? require("@/assets/sounds/ringtone.mp3") : null,
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (callState !== "incoming") {
      ringtone.pause();
      return;
    }
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
        });
        ringtone.loop = true;
        ringtone.play();
      } catch {}
    })();
    return () => {
      ringtone.pause();
    };
  }, [callState, ringtone]);

  // Haptic nudge when transitioning
  useEffect(() => {
    if (callState === "active") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [callState]);

  const handleAnswer = useCallback(() => {
    setCallState("active");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDecline = useCallback(() => {
    setCallState("ended");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      clearFakeCall();
      router.back();
    }, 800);
  }, [clearFakeCall, router]);

  const handleHangUp = useCallback(() => {
    setCallState("ended");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      clearFakeCall();
      router.back();
    }, 600);
  }, [clearFakeCall, router]);

  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const botPad = Platform.OS === "web" ? 48 : insets.bottom + 24;

  if (callState === "ended") {
    return (
      <View style={[styles.container, { backgroundColor: "#0D0D1A" }]}>
        <Text style={styles.endedText}>Call ended</Text>
      </View>
    );
  }

  if (callState === "active") {
    return (
      <View style={[styles.container, { backgroundColor: "#0D0D1A", paddingTop: topPad, paddingBottom: botPad }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
        <Text style={styles.activeCallLabel}>LoopIn • Private call</Text>
        <Text style={styles.activeCallName}>{callerName}</Text>
        <Text style={styles.activeTimer}>{timerStr}</Text>

        <View style={[styles.avatarWrap, { marginVertical: 32 }]}>
          <View style={styles.avatarActive}>
            <Text style={styles.avatarInitialLarge}>{initial}</Text>
          </View>
        </View>

        {/* Control row */}
        <View style={styles.activeControls}>
          <TouchableOpacity
            onPress={() => {
              setMuted((m) => !m);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
          >
            <Feather name={muted ? "mic-off" : "mic"} size={22} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{muted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSpeaker((s) => !s);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.controlBtn, speaker && styles.controlBtnActive]}
          >
            <Feather name="volume-2" size={22} color="#FFFFFF" />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => {}}>
            <Feather name="more-horizontal" size={22} color="#FFFFFF" />
            <Text style={styles.controlLabel}>More</Text>
          </TouchableOpacity>
        </View>

        {/* End call */}
        <View style={styles.endCallRow}>
          <TouchableOpacity onPress={handleHangUp} style={styles.endCallBtn}>
            <Feather name="phone-off" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Incoming call state
  return (
    <View style={[styles.container, { backgroundColor: "#0D0D1A", paddingTop: topPad, paddingBottom: botPad }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />

      <View style={styles.incomingTop}>
        <Text style={styles.incomingSubtitle}>Incoming call</Text>
        <Text style={styles.incomingName}>{callerName}</Text>
        <Text style={styles.incomingSub}>Mobile · LoopIn</Text>
      </View>

      {/* Animated avatar */}
      <View style={styles.avatarSection}>
        {/* Outer ring */}
        <Animated.View
          style={[
            styles.ringOuter,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            },
          ]}
        />
        {/* Mid ring */}
        <Animated.View
          style={[
            styles.ringMid,
            {
              opacity: ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.2, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Slide buttons */}
      <View style={styles.actionRow}>
        {/* Decline */}
        <View style={styles.actionItem}>
          <TouchableOpacity onPress={handleDecline} style={[styles.actionBtn, styles.declineBtn]}>
            <Feather name="phone-off" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Decline</Text>
        </View>

        {/* Message */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleDecline}
        >
          <View style={[styles.actionBtn, styles.msgBtn]}>
            <Feather name="message-square" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>Message</Text>
        </TouchableOpacity>

        {/* Answer */}
        <View style={styles.actionItem}>
          <TouchableOpacity onPress={handleAnswer} style={[styles.actionBtn, styles.answerBtn]}>
            <Feather name="phone" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 120;
const BTN_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  endedText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    position: "absolute",
    top: "50%",
    alignSelf: "center",
  },
  incomingTop: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 0,
  },
  incomingSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  incomingName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  incomingSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  avatarSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringOuter: {
    position: "absolute",
    width: AVATAR_SIZE + 80,
    height: AVATAR_SIZE + 80,
    borderRadius: (AVATAR_SIZE + 80) / 2,
    backgroundColor: "#7C3AED",
  },
  ringMid: {
    position: "absolute",
    width: AVATAR_SIZE + 40,
    height: AVATAR_SIZE + 40,
    borderRadius: (AVATAR_SIZE + 40) / 2,
    backgroundColor: "#7C3AED",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarInitial: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  actionItem: {
    alignItems: "center",
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  actionBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    backgroundColor: "#EF4444",
  },
  answerBtn: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  msgBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 8,
  },
  // Active call
  activeCallLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 12,
  },
  activeCallName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginTop: 6,
  },
  activeTimer: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },
  avatarWrap: {
    alignItems: "center",
  },
  avatarActive: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialLarge: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  activeControls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  controlBtn: {
    alignItems: "center",
    gap: 6,
    width: 80,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  controlLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  endCallRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  endCallBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
});
