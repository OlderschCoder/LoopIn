import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  usePhone,
  formatPhone,
  normalizePhone,
  type Conversation,
  type PhoneNumberRow,
} from "@/hooks/usePhone";

const PLATFORM_COLORS: Record<string, string> = {
  tinder: "#FE3C72",
  hinge: "#E8472B",
  bumble: "#F5C518",
  okcupid: "#0072EF",
  other: "#6B7280",
};

export default function PhoneTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phone = usePhone();
  const { matchProfiles, updateMatchProfile } = useApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState<PhoneNumberRow | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [composing, setComposing] = useState(false);
  const [composeNumber, setComposeNumber] = useState("");
  const [composeName, setComposeName] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const numRes = await phone.getNumber();
      setNumber(numRes.number);
      if (numRes.number) {
        const convRes = await phone.listConversations();
        setConversations(convRes.conversations);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openCompose() {
    setComposeNumber("");
    setComposeName("");
    setSelectedMatchId(null);
    setComposing(true);
  }

  function pickMatch(id: string) {
    const m = matchProfiles.find((p) => p.id === id);
    if (!m) return;
    setSelectedMatchId(id);
    setComposeName(m.username);
    if (m.contactPhone) setComposeNumber(m.contactPhone);
    else setComposeNumber("");
  }

  function startChat() {
    const raw = composeNumber.trim();
    if (!raw) return;
    const num = normalizePhone(raw);
    // Persist phone number back to the match profile so future chats auto-fill
    if (selectedMatchId) {
      const m = matchProfiles.find((p) => p.id === selectedMatchId);
      if (m && m.contactPhone !== num) {
        updateMatchProfile(selectedMatchId, { contactPhone: num });
      }
    }
    setComposing(false);
    router.push({
      pathname: "/conversation/[number]",
      params: { number: num, name: composeName.trim() },
    });
  }

  const topPadding = Platform.OS === "web" ? 16 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Private line</Text>
          {number && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {formatPhone(number.phoneNumber)}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/calls")}
            style={[styles.headerBtn, { backgroundColor: colors.safe + "18" }]}
          >
            <Feather name="phone-call" size={16} color={colors.safe} />
            <Text style={[styles.headerBtnText, { color: colors.safe }]}>Calls</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/phone-setup")}
            style={[styles.headerIconBtn]}
          >
            <Feather name="settings" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : !number ? (
        /* No number yet — prompt setup */
        <ScrollView contentContainerStyle={styles.setupOuter}>
          <View style={[styles.setupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.setupIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="phone" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.setupTitle, { color: colors.foreground }]}>
              Get a private number
            </Text>
            <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
              Text and call your matches without sharing your real number. Every
              conversation is saved privately to your vault.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/phone-setup")}
              style={[styles.setupBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="shield" size={16} color={colors.primaryForeground} />
              <Text style={[styles.setupBtnText, { color: colors.primaryForeground }]}>
                Set up my private line
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { icon: "eye-off", text: "Matches never see your real number" },
              { icon: "mic", text: "Calls are recorded for your safety" },
              { icon: "archive", text: "Every text & call saved to your vault" },
            ].map((item) => (
              <View key={item.icon} style={styles.infoRow}>
                <Feather name={item.icon as any} size={15} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Conversations list */
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {error && (
            <Text style={[styles.errorText, { color: colors.sos }]}>{error}</Text>
          )}

          {conversations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="message-circle" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the pencil button to text a match privately.
              </Text>
            </View>
          ) : (
            conversations.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() =>
                  router.push({
                    pathname: "/conversation/[number]",
                    params: { number: c.contactNumber, name: c.contactName ?? "" },
                  })
                }
                style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(c.contactName?.[0] ?? "#").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.convName, { color: colors.foreground }]}>
                    {c.contactName || formatPhone(c.contactNumber)}
                  </Text>
                  <Text
                    style={[styles.convPreview, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {c.lastMessagePreview || "No messages yet"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Compose FAB */}
      {number && (
        <TouchableOpacity
          onPress={openCompose}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        >
          <Feather name="edit" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      {/* Compose sheet */}
      <Modal
        visible={composing}
        transparent
        animationType="slide"
        onRequestClose={() => setComposing(false)}
      >
        <TouchableWithoutFeedback onPress={() => setComposing(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New message</Text>

            {/* Match picker */}
            {matchProfiles.length > 0 && (
              <>
                <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Pick a match</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  keyboardShouldPersistTaps="always"
                >
                  {matchProfiles.map((m) => {
                    const pc = PLATFORM_COLORS[m.platform] ?? "#6B7280";
                    const selected = selectedMatchId === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => pickMatch(m.id)}
                        style={[
                          styles.matchChip,
                          {
                            backgroundColor: selected ? pc + "22" : colors.background,
                            borderColor: selected ? pc : colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.matchChipDot, { backgroundColor: pc }]} />
                        <Text style={[styles.matchChipText, { color: selected ? pc : colors.foreground }]}
                          numberOfLines={1}
                        >
                          {m.username}
                        </Text>
                        {m.contactPhone && (
                          <Feather name="check-circle" size={12} color={pc} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Their phone number *</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={composeNumber}
                onChangeText={setComposeNumber}
                autoFocus={matchProfiles.length === 0}
              />
            </View>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Their name (optional)</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. Jake from Hinge"
                placeholderTextColor={colors.mutedForeground}
                value={composeName}
                onChangeText={setComposeName}
                returnKeyType="done"
                onSubmitEditing={startChat}
              />
            </View>

            <TouchableOpacity
              onPress={startChat}
              disabled={!composeNumber.trim()}
              style={[
                styles.startBtn,
                { backgroundColor: composeNumber.trim() ? colors.primary : colors.border },
              ]}
            >
              <Feather name="message-circle" size={18} color={colors.primaryForeground} />
              <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
                Start chat
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  headerIconBtn: { width: 32, alignItems: "center" },
  setupOuter: { padding: 20, gap: 16 },
  setupCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  setupIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  setupTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  setupText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 22,
  },
  setupBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", marginVertical: 8 },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    marginTop: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  convPreview: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetWrap: { justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sheetLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
  inputBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 13 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
  },
  startBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  matchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 150,
  },
  matchChipDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  matchChipText: { fontSize: 13, fontFamily: "Inter_500Medium", flexShrink: 1 },
});
