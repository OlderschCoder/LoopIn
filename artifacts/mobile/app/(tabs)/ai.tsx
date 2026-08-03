import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FlagBadge from "@/components/FlagBadge";
import { useColors } from "@/hooks/useColors";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AnalysisResult {
  riskLevel: "low" | "medium" | "high";
  summary: string;
  greenFlags: string[];
  yellowFlags: string[];
  redFlags: string[];
  recommendations: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  low: { color: "#059669", label: "Low Risk", icon: "check-circle" as const },
  medium: { color: "#D97706", label: "Review Needed", icon: "alert-triangle" as const },
  high: { color: "#DC2626", label: "Proceed with Caution", icon: "alert-octagon" as const },
};

const ANALYZE_EXAMPLES = [
  "He said he loves me after 3 days. Wants me at his apartment for our first date.",
  "She keeps canceling last minute and asked to borrow $200.",
  "Very attentive, asks thoughtful questions, respects my boundaries. Coffee shop first date.",
];

const CHAT_STARTERS = [
  "How do I set a boundary politely?",
  "Help me respond to this message",
  "Is this behavior a red flag?",
  "How do I turn down a second date?",
];

const ENV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL =
  ENV_DOMAIN && ENV_DOMAIN !== "undefined"
    ? `https://${ENV_DOMAIN}`
    : typeof window !== "undefined"
      ? window.location.origin
      : "";

const genId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// ─── Analyze Panel ────────────────────────────────────────────────────────────
function AnalyzePanel() {
  const colors = useColors();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Could not complete analysis. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const riskConfig = result ? RISK_CONFIG[result.riskLevel] : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.panelContent}
    >
      <Text style={[styles.panelDesc, { color: colors.mutedForeground }]}>
        Paste a profile, chat messages, or describe the situation — get an honest, structured read.
      </Text>

      <View style={[styles.textBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="Paste messages, profile bio, or describe what happened..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {!result && (
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.examplesLabel, { color: colors.mutedForeground }]}>Try an example</Text>
          {ANALYZE_EXAMPLES.map((ex, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setText(ex)}
              style={[styles.exampleChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Feather name="edit-3" size={12} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.exampleText, { color: colors.foreground }]} numberOfLines={2}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={analyze}
        disabled={loading || !text.trim()}
        style={[styles.primaryBtn, { backgroundColor: loading || !text.trim() ? colors.border : colors.primary }]}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="shield" size={17} color={loading || !text.trim() ? colors.mutedForeground : colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: loading || !text.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
              Get the read
            </Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: "#DC262610", borderColor: "#DC262630" }]}>
          <Feather name="alert-circle" size={15} color="#DC2626" />
          <Text style={[styles.errorText, { color: "#DC2626" }]}>{error}</Text>
        </View>
      )}

      {result && riskConfig && (
        <View style={{ gap: 4 }}>
          <View style={[styles.riskBanner, { backgroundColor: riskConfig.color + "12", borderColor: riskConfig.color + "30" }]}>
            <View style={[styles.riskIconWrap, { backgroundColor: riskConfig.color + "20" }]}>
              <Feather name={riskConfig.icon} size={20} color={riskConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.riskLabel, { color: riskConfig.color }]}>{riskConfig.label}</Text>
              <Text style={[styles.riskSummary, { color: colors.foreground }]}>{result.summary}</Text>
            </View>
          </View>

          {result.redFlags.length > 0 && (
            <View style={styles.flagSection}>
              <Text style={[styles.flagSectionTitle, { color: "#DC2626" }]}>Red flags</Text>
              {result.redFlags.map((f, i) => <FlagBadge key={i} type="red" text={f} />)}
            </View>
          )}
          {result.yellowFlags.length > 0 && (
            <View style={styles.flagSection}>
              <Text style={[styles.flagSectionTitle, { color: "#D97706" }]}>Worth noting</Text>
              {result.yellowFlags.map((f, i) => <FlagBadge key={i} type="yellow" text={f} />)}
            </View>
          )}
          {result.greenFlags.length > 0 && (
            <View style={styles.flagSection}>
              <Text style={[styles.flagSectionTitle, { color: "#059669" }]}>Positive signs</Text>
              {result.greenFlags.map((f, i) => <FlagBadge key={i} type="green" text={f} />)}
            </View>
          )}
          {result.recommendations.length > 0 && (
            <View style={[styles.recommendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="compass" size={14} color={colors.primary} />
                <Text style={[styles.flagSectionTitle, { color: colors.primary }]}>Recommendations</Text>
              </View>
              {result.recommendations.map((r, i) => (
                <View key={i} style={styles.recRow}>
                  <View style={[styles.recDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.recText, { color: colors.foreground }]}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => { setResult(null); setText(""); }}
            style={[styles.clearBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>Analyze something else</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: "Hi, I'm your AI Wingwoman. I'm here to help you date smarter and safer — no judgment, just honest support. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { id: genId(), role: "user", content: text.trim() };
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const history = [...messages, userMsg].reverse().map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch(`${BASE_URL}/api/coach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        if (!res.ok) throw new Error("Coach unavailable");
        const data = (await res.json()) as { reply: string };
        setMessages((prev) => [{ id: genId(), role: "assistant", content: data.reply }, ...prev]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        setMessages((prev) => [{ id: genId(), role: "assistant", content: "I'm having trouble connecting right now. Please try again." }, ...prev]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={13} color={colors.primaryForeground} />
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
              { maxWidth: "80%" },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading ? (
            <View style={[styles.msgRow, styles.msgRowAssistant]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Feather name="shield" size={13} color={colors.primaryForeground} />
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {messages.length === 1 && (
        <FlatList
          data={CHAT_STARTERS}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => sendMessage(item)}
              style={[styles.starterChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.starterText, { color: colors.primary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 12 : insets.bottom + 8 }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: colors.foreground }]}
            placeholder="Ask your Wingwoman..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.border }]}
          >
            <Feather name="send" size={15} color={input.trim() && !loading ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Mode = "analyze" | "chat";

export default function AIScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("analyze");

  const topPadding = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>AI Assistant</Text>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
              {mode === "analyze" ? "Get a structured read on anyone" : "Real-time coaching & guidance"}
            </Text>
          </View>
          <View style={[styles.aiPill, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <View style={[styles.aiDot, { backgroundColor: colors.safe }]} />
            <Text style={[styles.aiPillText, { color: colors.primary }]}>Online</Text>
          </View>
        </View>

        {/* Segment control */}
        <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["analyze", "chat"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.segTab, mode === m && { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Feather
                name={m === "analyze" ? "shield" : "message-circle"}
                size={14}
                color={mode === m ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[styles.segTabText, { color: mode === m ? colors.primaryForeground : colors.mutedForeground }]}>
                {m === "analyze" ? "Analyze" : "Chat"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Panels */}
      {mode === "analyze" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <AnalyzePanel />
        </KeyboardAvoidingView>
      ) : (
        <ChatPanel />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 2 },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aiPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  aiDot: { width: 6, height: 6, borderRadius: 3 },
  aiPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  segment: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 4,
  },
  segTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Analyze panel
  panelContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  panelDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  textBox: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, minHeight: 130 },
  textInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, flex: 1 },
  examplesLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  exampleChip: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  exampleText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginBottom: 14 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  riskBanner: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14, alignItems: "flex-start" },
  riskIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  riskLabel: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  riskSummary: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  flagSection: { marginBottom: 12 },
  flagSectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  recommendCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  recRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  recDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  recText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  clearBtn: { alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginBottom: 8 },
  clearBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Chat panel
  msgList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },
  msgRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  starterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  starterText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", borderRadius: 24, borderWidth: 1, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8 },
  chatInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, maxHeight: 100, paddingVertical: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
