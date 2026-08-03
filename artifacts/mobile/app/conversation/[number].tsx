import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { usePhone, formatPhone, normalizePhone, type PhoneMessage } from "@/hooks/usePhone";

const PLATFORM_COLORS: Record<string, string> = {
  tinder: "#FE3C72",
  hinge: "#E8472B",
  bumble: "#F5C518",
  okcupid: "#0072EF",
  other: "#6B7280",
};

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phone = usePhone();
  const { matchProfiles } = useApp();
  const params = useLocalSearchParams<{ number: string; name?: string }>();
  // Normalize to E.164 — the param may arrive as "(620) 417-1200" from older
  // navigation calls, and parentheses in a URL segment break Expo Router's
  // route-group parser, producing a blank screen.
  const contactNumber = normalizePhone(String(params.number ?? "")) || String(params.number ?? "");
  const contactName = params.name ? String(params.name) : "";

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PhoneMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const convRes = await phone.listConversations();
      const match = convRes.conversations.find((c) => c.contactNumber === contactNumber);
      if (match) {
        setConversationId(match.id);
        const msgRes = await phone.getMessages(match.id);
        setMessages(msgRes.messages);
      } else {
        setMessages([]);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [phone, contactNumber]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to send pictures.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Error", "Could not read image data.");
      return;
    }
    setPendingImage({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  }

  async function handleSend() {
    const body = draft.trim();
    if ((!body && !pendingImage) || sending) return;
    setSending(true);
    setError(null);
    const imageToSend = pendingImage;
    setPendingImage(null);
    try {
      let mediaUrl: string | undefined;
      if (imageToSend) {
        const uploaded = await phone.uploadMedia(imageToSend.base64, imageToSend.mimeType);
        mediaUrl = uploaded.url;
      }
      const res = await phone.sendMessage({
        to: contactNumber,
        contactName: contactName || undefined,
        body: body || " ",
        mediaUrl,
      });
      setConversationId(res.conversationId);
      setDraft("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Optimistic update — append the sent message immediately so the screen
      // never goes blank waiting on a second network call.
      const optimistic: PhoneMessage = {
        id: res.messageId,
        conversationId: res.conversationId,
        direction: "outbound",
        body: body,
        mediaUrls: mediaUrl ? [mediaUrl] : null,
        status: res.status ?? "queued",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      // Background sync — quietly refresh to pull any inbound messages or
      // status updates without blocking or crashing the UI.
      phone.getMessages(res.conversationId)
        .then((msgRes) => {
          if (msgRes?.messages) setMessages(msgRes.messages);
        })
        .catch(() => { /* non-fatal — optimistic message is already shown */ });
    } catch (e: any) {
      const raw: string = e?.message ?? "";
      setError(raw || "Could not send your message.");
      if (imageToSend) setPendingImage(imageToSend);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch { /* ignore */ }
    } finally {
      setSending(false);
    }
  }

  async function handleCall() {
    if (calling) return;
    setCalling(true);
    try {
      await phone.startCall({ to: contactNumber, contactName: contactName || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Connecting your call",
        "Your phone will ring shortly. Answer it, and we'll connect you to them through your private number. The call is recorded for your safety.",
      );
    } catch (e: any) {
      Alert.alert("Call failed", e?.message ?? "Could not start the call.");
    } finally {
      setCalling(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 16 : insets.top + 8;
  const canSend = (draft.trim().length > 0 || pendingImage !== null) && !sending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      {(() => {
        const linked = matchProfiles.find((p) => p.contactPhone === contactNumber);
        const platformColor = linked ? (PLATFORM_COLORS[linked.platform] ?? "#6B7280") : null;
        return (
          <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="chevron-left" size={26} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
                {contactName || formatPhone(contactNumber)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                {contactName ? (
                  <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                    {formatPhone(contactNumber)}
                  </Text>
                ) : null}
                {linked && platformColor && (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/match/[id]", params: { id: linked.id } })}
                    style={[styles.matchBadge, { backgroundColor: platformColor + "18", borderColor: platformColor + "40" }]}
                  >
                    <View style={[styles.matchDot, { backgroundColor: platformColor }]} />
                    <Text style={[styles.matchBadgeText, { color: platformColor }]}>
                      {linked.platform.charAt(0).toUpperCase() + linked.platform.slice(1)} profile →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleCall} disabled={calling} style={styles.callBtn}>
              {calling ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Feather name="phone" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={[styles.startCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.startText, { color: colors.mutedForeground }]}>
                This is the start of your conversation. Messages are sent from your
                private number and saved here.
              </Text>
            </View>
          )}
          {messages.map((m) => {
            const out = m.direction === "outbound";
            const hasImages = Array.isArray(m.mediaUrls) && m.mediaUrls.length > 0;
            const hasText = m.body && m.body.trim() && m.body.trim() !== " ";
            return (
              <View
                key={m.id}
                style={[styles.bubbleWrap, out ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}
              >
                {/* Images in bubble */}
                {hasImages && (
                  <View style={styles.imageGrid}>
                    {(m.mediaUrls as string[]).map((url, i) => (
                      <Image
                        key={i}
                        source={{ uri: url }}
                        style={[
                          styles.bubbleImage,
                          { borderColor: out ? colors.primary : colors.border },
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                )}
                {/* Text bubble (skip if body is just a space placeholder) */}
                {hasText && (
                  <View
                    style={[
                      styles.bubble,
                      out
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: out ? colors.primaryForeground : colors.foreground }]}>
                      {m.body}
                    </Text>
                  </View>
                )}
                <Text style={[styles.bubbleTime, { color: colors.mutedForeground }]}>
                  {new Date(m.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {error && (
        <Text style={[styles.errorText, { color: colors.sos }]}>{error}</Text>
      )}

      {/* Image preview strip */}
      {pendingImage && (
        <View style={[styles.previewStrip, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.previewThumbWrap}>
            <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} resizeMode="cover" />
            <TouchableOpacity
              onPress={() => setPendingImage(null)}
              style={[styles.previewRemove, { backgroundColor: colors.sos }]}
            >
              <Feather name="x" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
            Photo ready to send
          </Text>
        </View>
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {/* Photo picker button */}
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.attachBtn, { backgroundColor: colors.muted }]}
          disabled={sending}
        >
          <Feather name="image" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={pendingImage ? "Add a caption... (optional)" : "Type a message..."}
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.border }]}
        >
          {sending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Feather name="arrow-up" size={20} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 26 },
  headerName: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  matchDot: { width: 6, height: 6, borderRadius: 3 },
  matchBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  callBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  startCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  startText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  bubbleWrap: { marginBottom: 10 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4, maxWidth: "80%" },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "#eee",
  },
  bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3, opacity: 0.6 },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  previewStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  previewThumbWrap: { position: "relative" },
  previewThumb: { width: 56, height: 56, borderRadius: 10 },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 4,
    maxHeight: 120,
  },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
