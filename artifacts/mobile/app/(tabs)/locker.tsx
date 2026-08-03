import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EvidenceItem } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TYPE_CONFIG: Record<
  EvidenceItem["type"],
  { icon: keyof typeof Feather.glyphMap; label: string; color: string }
> = {
  note: { icon: "file-text", label: "Note", color: "#7C3AED" },
  phone: { icon: "phone", label: "Phone #", color: "#EC4899" },
  "screenshot-desc": { icon: "camera", label: "Screenshot", color: "#F59E0B" },
  concern: { icon: "alert-triangle", label: "Concern", color: "#EF4444" },
};

export default function LockerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { evidenceItems, addEvidenceItem, deleteEvidenceItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [personName, setPersonName] = useState("");
  const [type, setType] = useState<EvidenceItem["type"]>("note");

  const topPadding = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  function handleSave() {
    if (!title.trim() || !content.trim()) return;
    addEvidenceItem({
      title: title.trim(),
      content: content.trim(),
      personName: personName.trim() || undefined,
      type,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle("");
    setContent("");
    setPersonName("");
    setType("note");
    setShowForm(false);
  }

  function handleDelete(id: string) {
    Alert.alert("Delete item", "Remove this from your locker?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteEvidenceItem(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding,
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 90,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Evidence Locker</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Private and secure
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm((v) => !v)}
          style={[styles.addBtn, { backgroundColor: showForm ? colors.border : colors.primary }]}
        >
          <Feather name={showForm ? "x" : "plus"} size={20} color={showForm ? colors.foreground : colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <View style={[styles.privacyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="lock" size={14} color={colors.primary} />
        <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
          Stored privately on your device. Not shared with anyone.
        </Text>
      </View>

      {/* Add Form */}
      {showForm && (
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Add to locker</Text>

          <Text style={[styles.label, { color: colors.foreground }]}>Type</Text>
          <View style={styles.typeRow}>
            {(Object.entries(TYPE_CONFIG) as [EvidenceItem["type"], typeof TYPE_CONFIG[EvidenceItem["type"]]][]).map(([t, cfg]) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: type === t ? cfg.color + "20" : colors.surface,
                    borderColor: type === t ? cfg.color : colors.border,
                  },
                ]}
              >
                <Feather name={cfg.icon} size={13} color={type === t ? cfg.color : colors.mutedForeground} />
                <Text style={[styles.typeChipText, { color: type === t ? cfg.color : colors.mutedForeground }]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Title</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Brief description..."
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Details</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border, minHeight: 90 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="What happened? What did they say?"
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Person (optional)</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Their name..."
              placeholderTextColor={colors.mutedForeground}
              value={personName}
              onChangeText={setPersonName}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!title.trim() || !content.trim()}
            style={[
              styles.saveBtn,
              { backgroundColor: title.trim() && content.trim() ? colors.primary : colors.border },
            ]}
          >
            <Feather name="lock" size={16} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              Save to locker
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Items */}
      {evidenceItems.length === 0 && !showForm ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="lock" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your locker is empty
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Save notes, phone numbers, screenshots, or concerns about anyone you're dating.
          </Text>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
              Add first item
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {evidenceItems.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIconWrap, { backgroundColor: cfg.color + "15" }]}>
                      <Feather name={cfg.icon} size={14} color={cfg.color} />
                    </View>
                    <View>
                      <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                        {item.title}
                      </Text>
                      {item.personName && (
                        <Text style={[styles.itemPerson, { color: colors.mutedForeground }]}>
                          {item.personName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.itemContent, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {item.content}
                </Text>
                <Text style={[styles.itemDate, { color: colors.border }]}>
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 18,
  },
  privacyText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  formTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 14 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8, marginTop: 12 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  typeChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputBox: { borderRadius: 12, borderWidth: 1, padding: 12 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemsList: { gap: 0 },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemPerson: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  itemDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
