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

import { useColors } from "@/hooks/useColors";
import {
  usePhone,
  formatPhone,
  normalizePhone,
  type Conversation,
  type PhoneNumberRow,
} from "@/hooks/usePhone";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phone = usePhone();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState<PhoneNumberRow | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Compose sheet state
  const [composing, setComposing] = useState(false);
  const [composeNumber, setComposeNumber] = useState("");
  const [composeName, setComposeName] = useState("");

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
    setComposing(true);
  }

  function startChat() {
    const raw = composeNumber.trim();
    if (!raw) return;
    const num = normalizePhone(raw);
    setComposing(false);
    router.push({
      pathname: "/conversation/[number]",
      params: { number: num, name: composeName.trim() },
    });
  }

  const topPadding = Platform.OS === "web" ? 24 : insets.top + 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity onPress={() => router.push("/phone-setup")} style={styles.iconBtn}>
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : !number ? (
        <View style={styles.center}>
          <View style={[styles.setupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="phone" size={32} color={colors.primary} />
            <Text style={[styles.setupTitle, { color: colors.foreground }]}>
              Get your private number
            </Text>
            <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
              Text and call your matches without sharing your real number. Everything
              is saved here for your safety.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/phone-setup")}
              style={[styles.setupBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.setupBtnText, { color: colors.primaryForeground }]}>
                Set up now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
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
          <View style={[styles.numberBanner, { backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={14} color={colors.secondaryForeground} />
            <Text style={[styles.numberBannerText, { color: colors.secondaryForeground }]}>
              Your private number: {formatPhone(number.phoneNumber)}
            </Text>
            <TouchableOpacity onPress={() => router.push("/calls")} style={styles.callsLink}>
              <Feather name="phone-call" size={14} color={colors.secondaryForeground} />
              <Text style={[styles.callsLinkText, { color: colors.secondaryForeground }]}>
                Calls
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <Text style={[styles.errorText, { color: colors.sos }]}>{error}</Text>
          )}

          {conversations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="message-circle" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the pencil button to start texting a match privately.
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
                  <Text style={[styles.convPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {c.lastMessagePreview || "No messages yet"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB — compose button */}
      {number && (
        <TouchableOpacity
          onPress={openCompose}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        >
          <Feather name="edit" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      {/* Compose sheet — works on Android and iOS */}
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

            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              New message
            </Text>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>
              Their phone number *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={composeNumber}
                onChangeText={setComposeNumber}
                autoFocus
              />
            </View>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>
              Their name (optional)
            </Text>
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
    paddingBottom: 12,
  },
  backBtn: { width: 26 },
  iconBtn: { width: 26, alignItems: "flex-end" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  setupCard: { alignItems: "center", gap: 10, padding: 28, borderRadius: 18, borderWidth: 1 },
  setupTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  setupText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  setupBtn: { marginTop: 8, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 22 },
  setupBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  numberBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
  },
  numberBannerText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  callsLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  callsLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  empty: { alignItems: "center", gap: 8, padding: 32, borderRadius: 16, borderWidth: 1, marginTop: 20 },
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
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
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
});
