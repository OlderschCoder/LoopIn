import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
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

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi, I'm your AI Wingwoman. I'm here to help you date smarter and safer — no judgment, just honest support. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const genId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { id: genId(), role: "user", content: text.trim() };
      setMessages((prev) => [userMsg, ...prev]);
      setInput("");
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const history = [...messages, userMsg]
          .reverse()
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch(`${BASE_URL}/api/coach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) throw new Error("Coach unavailable");
        const data = await res.json() as { reply: string };
        const assistantMsg: Message = {
          id: genId(),
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        const errorMsg: Message = {
          id: genId(),
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        };
        setMessages((prev) => [errorMsg, ...prev]);
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
        <View
          style={[
            styles.messageRow,
            isUser ? styles.messageRowUser : styles.messageRowAssistant,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={14} color={colors.primaryForeground} />
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                : {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderBottomLeftRadius: 4,
                  },
              { maxWidth: "80%" },
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: isUser ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            AI Wingwoman
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.onlineDot, { backgroundColor: colors.safe }]} />
            <Text style={[styles.headerStatus, { color: colors.mutedForeground }]}>
              Here for you
            </Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Feather name="shield" size={14} color={colors.primaryForeground} />
              </View>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderBottomLeftRadius: 4,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Starter prompts */}
      {messages.length === 1 && (
        <View style={styles.starters}>
          <FlatList
            data={STARTERS}
            horizontal
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.starterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendMessage(item)}
                style={[styles.starterChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.starterText, { color: colors.primary }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 8,
          },
        ]}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
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
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !loading ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name="send"
              size={16}
              color={input.trim() && !loading ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  starters: { paddingVertical: 8 },
  starterList: { paddingHorizontal: 16, gap: 8 },
  starterChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  starterText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
