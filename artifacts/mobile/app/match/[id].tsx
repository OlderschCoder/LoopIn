import { Feather } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DatingPlatform, MatchProfile } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PLATFORMS: { value: DatingPlatform; label: string; color: string }[] = [
  { value: "tinder", label: "Tinder", color: "#FE3C72" },
  { value: "hinge", label: "Hinge", color: "#E8472B" },
  { value: "bumble", label: "Bumble", color: "#F5C518" },
  { value: "okcupid", label: "OkCupid", color: "#0072EF" },
  { value: "other", label: "Other", color: "#6B7280" },
];

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
  placeholder,
  colors,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {hint && <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>}
      <View
        style={[
          styles.inputBox,
          { backgroundColor: colors.card, borderColor: colors.border },
          multiline && { minHeight: 110 },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.foreground }, multiline && { textAlignVertical: "top" }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

export default function MatchProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matchProfiles, datePlans, updateMatchProfile, deleteMatchProfile } = useApp();

  const profileData = matchProfiles.find((p) => p.id === id);

  const [editing, setEditing] = useState(false);
  const [platform, setPlatform] = useState<DatingPlatform>(profileData?.platform ?? "tinder");
  const [username, setUsername] = useState(profileData?.username ?? "");
  const [age, setAge] = useState(profileData?.age ?? "");
  const [bioNotes, setBioNotes] = useState(profileData?.bioNotes ?? "");
  const [profileDescription, setProfileDescription] = useState(profileData?.profileDescription ?? "");
  const [pastedConversation, setPastedConversation] = useState(profileData?.pastedConversation ?? "");
  const [concernsNoted, setConcernsNoted] = useState(profileData?.concernsNoted ?? "");
  const [contactPhone, setContactPhone] = useState(profileData?.contactPhone ?? "");
  const [photos, setPhotos] = useState<string[]>(profileData?.photos ?? []);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // Files copied to disk this session but not yet committed via Save.
  const uncommittedFilesRef = useRef<Set<string>>(new Set());
  // Already-saved files the user removed; deleted from disk only on Save.
  const pendingDeleteRef = useRef<Set<string>>(new Set());

  function deleteFile(uri: string) {
    if (Platform.OS === "web") return;
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // ignore missing/locked files
    }
  }

  // On unmount, clean up any copied-but-unsaved files so nothing is orphaned.
  useEffect(() => {
    return () => {
      uncommittedFilesRef.current.forEach(deleteFile);
      uncommittedFilesRef.current.clear();
    };
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function persistImage(uri: string): Promise<string> {
    if (Platform.OS === "web") return uri;
    try {
      const dir = new Directory(Paths.document, "profiles");
      if (!dir.exists) dir.create();
      const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
      const dest = new File(dir, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
      new File(uri).copy(dest);
      uncommittedFilesRef.current.add(dest.uri);
      return dest.uri;
    } catch {
      return uri;
    }
  }

  async function addPhotos(fromCamera: boolean) {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Camera needed", "Allow camera access to snap a profile photo.");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (res.canceled || !res.assets?.length) return;
        const saved = await persistImage(res.assets[0].uri);
        setPhotos((prev) => [...prev, saved]);
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: true,
          selectionLimit: 8,
          quality: 0.8,
        });
        if (res.canceled || !res.assets?.length) return;
        const saved = await Promise.all(res.assets.map((a) => persistImage(a.uri)));
        setPhotos((prev) => [...prev, ...saved]);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Couldn't add photo", "Something went wrong selecting the image.");
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
    if (uncommittedFilesRef.current.has(uri)) {
      // Never saved — safe to delete the file immediately.
      uncommittedFilesRef.current.delete(uri);
      deleteFile(uri);
    } else {
      // Saved file: defer deletion until the user commits with Save.
      pendingDeleteRef.current.add(uri);
    }
  }

  if (!profileData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Profile not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = profileData;
  const linkedPlan = profile.datePlanId ? datePlans.find((d) => d.id === profile.datePlanId) : null;
  const platformMeta = PLATFORMS.find((p) => p.value === profile.platform) ?? PLATFORMS[4];

  function handleSave() {
    updateMatchProfile(id, { platform, username, age, bioNotes, profileDescription, pastedConversation, concernsNoted, photos, contactPhone: contactPhone.trim() || undefined });
    // Commit: removed-saved files can now be deleted; new files are persisted.
    pendingDeleteRef.current.forEach(deleteFile);
    pendingDeleteRef.current.clear();
    uncommittedFilesRef.current.clear();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert("Delete match profile", `Remove the profile for ${profile.username}? Saved photos will be erased from your device.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // deleteMatchProfile erases saved photo files; unmount cleanup removes uncommitted ones.
          deleteMatchProfile(id);
          router.back();
        },
      },
    ]);
  }

  function analyzeChat() {
    if (!profile.pastedConversation.trim()) {
      Alert.alert("No conversation saved", "Paste some messages in this profile first, then tap Analyze.");
      return;
    }
    router.push("/(tabs)/ai");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Match Profile</Text>
          {editing ? (
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 120 : insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Platform badge + linked plan */}
          <View style={styles.metaRow}>
            <View style={[styles.platformBadge, { backgroundColor: platformMeta.color + "18", borderColor: platformMeta.color + "40" }]}>
              <View style={[styles.platformDot, { backgroundColor: platformMeta.color }]} />
              <Text style={[styles.platformLabel, { color: platformMeta.color }]}>{platformMeta.label}</Text>
            </View>
            {linkedPlan && (
              <View style={[styles.linkedBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Feather name="calendar" size={11} color={colors.primary} />
                <Text style={[styles.linkedText, { color: colors.primary }]}>
                  Linked · {linkedPlan.locationName || "Date plan"}
                </Text>
              </View>
            )}
          </View>

          {editing ? (
            <>
              {/* Platform selector */}
              <Text style={[styles.label, { color: colors.foreground }]}>Platform</Text>
              <View style={styles.platformRow}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setPlatform(p.value)}
                    style={[
                      styles.platformChip,
                      {
                        backgroundColor: platform === p.value ? p.color + "20" : colors.card,
                        borderColor: platform === p.value ? p.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: platform === p.value ? p.color : colors.mutedForeground }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Photo archive (edit) */}
              <Text style={[styles.label, { color: colors.foreground }]}>Profile photos / screenshots</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Saved privately on your device so you keep them even if they delete their profile.
              </Text>
              <View style={styles.photoGrid}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoThumbWrap}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewerUri(uri)}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removePhoto(uri)}
                      style={styles.photoRemove}
                      hitSlop={8}
                    >
                      <Feather name="x" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => addPhotos(false)}
                  style={[styles.photoAdd, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Feather name="image" size={20} color={colors.primary} />
                  <Text style={[styles.photoAddText, { color: colors.mutedForeground }]}>Library</Text>
                </TouchableOpacity>
                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    onPress={() => addPhotos(true)}
                    style={[styles.photoAdd, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <Feather name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.photoAddText, { color: colors.mutedForeground }]}>Camera</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ height: 18 }} />

              <Field label="Username / display name" placeholder="@their_name" value={username} onChange={setUsername} colors={colors} />
              <Field label="Age" placeholder="e.g. 28" value={age} onChange={setAge} colors={colors} />

              {/* Private Line phone number */}
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.label, { color: colors.foreground }]}>Private line number</Text>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Their phone number — used to text &amp; call through your private line
                </Text>
                <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="(555) 123-4567"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>
              </View>
              <Field
                label="Bio notes"
                hint="Key things from their profile bio"
                placeholder="What stood out in their bio..."
                value={bioNotes}
                onChange={setBioNotes}
                multiline
                colors={colors}
              />
              <Field
                label="Profile description"
                hint="Appearance, photos, vibe — anything you want to remember"
                placeholder="Describe their profile photos, style, overall impression..."
                value={profileDescription}
                onChange={setProfileDescription}
                multiline
                colors={colors}
              />
              <Field
                label="Pasted conversation"
                hint="Copy & paste messages from your chat. Used for AI analysis."
                placeholder="Paste your chat messages here..."
                value={pastedConversation}
                onChange={setPastedConversation}
                multiline
                colors={colors}
              />
              <Field
                label="Concerns or red flags noted"
                hint="Anything that felt off, inconsistencies, gut feelings"
                placeholder="Any concerns, inconsistencies, or gut feelings..."
                value={concernsNoted}
                onChange={setConcernsNoted}
                multiline
                colors={colors}
              />
            </>
          ) : (
            <>
              {/* Read-only view */}
              <Text style={[styles.name, { color: colors.foreground }]}>{profile.username || "No name"}</Text>
              {profile.age && (
                <Text style={[styles.ageLine, { color: colors.mutedForeground }]}>Age {profile.age}</Text>
              )}

              {photos.length > 0 && (
                <View style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Feather name="image" size={14} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                      Saved photos · {photos.length}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {photos.map((uri) => (
                      <TouchableOpacity key={uri} activeOpacity={0.9} onPress={() => setViewerUri(uri)}>
                        <Image source={{ uri }} style={styles.galleryImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {profile.bioNotes ? <Section title="Bio notes" body={profile.bioNotes} colors={colors} /> : null}
              {profile.profileDescription ? <Section title="Profile description" body={profile.profileDescription} colors={colors} /> : null}

              {profile.concernsNoted ? (
                <View style={[styles.concernBox, { backgroundColor: colors.danger + "08", borderColor: colors.danger + "25" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Feather name="alert-triangle" size={14} color={colors.danger} />
                    <Text style={[styles.sectionTitle, { color: colors.danger }]}>Concerns noted</Text>
                  </View>
                  <Text style={[styles.sectionBody, { color: colors.foreground }]}>{profile.concernsNoted}</Text>
                </View>
              ) : null}

              {profile.pastedConversation ? (
                <View style={[styles.chatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Feather name="message-square" size={14} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Saved conversation</Text>
                    </View>
                    <Text style={[styles.chatLength, { color: colors.mutedForeground }]}>
                      {profile.pastedConversation.length} chars
                    </Text>
                  </View>
                  <Text
                    style={[styles.chatPreview, { color: colors.mutedForeground }]}
                    numberOfLines={4}
                  >
                    {profile.pastedConversation}
                  </Text>
                </View>
              ) : null}

              {!profile.bioNotes && !profile.profileDescription && !profile.pastedConversation && !profile.concernsNoted && (
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Feather name="edit-2" size={24} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Fill in their profile</Text>
                  <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                    Add bio notes, paste your conversation, and jot down any concerns.
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Action buttons */}
          {!editing && (
            <View style={styles.actions}>
              {/* Private line quick-actions */}
              {profile.contactPhone && (
                <View style={styles.phoneActions}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/conversation/[number]",
                        params: { number: profile.contactPhone!, name: profile.username },
                      })
                    }
                    style={[styles.phoneBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                  >
                    <Feather name="message-circle" size={16} color={colors.primaryForeground} />
                    <Text style={[styles.phoneBtnText, { color: colors.primaryForeground }]}>Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/conversation/[number]",
                        params: { number: profile.contactPhone!, name: profile.username, autoCall: "1" },
                      })
                    }
                    style={[styles.phoneBtn, { backgroundColor: colors.safe }]}
                    activeOpacity={0.85}
                  >
                    <Feather name="phone" size={16} color="#fff" />
                    <Text style={[styles.phoneBtnText, { color: "#fff" }]}>Call</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!profile.contactPhone && (
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  style={[styles.addPhoneBtn, { borderColor: colors.primary + "50", backgroundColor: colors.primary + "0D" }]}
                  activeOpacity={0.8}
                >
                  <Feather name="phone" size={15} color={colors.primary} />
                  <Text style={[styles.addPhoneBtnText, { color: colors.primary }]}>
                    Add private line number to text &amp; call
                  </Text>
                </TouchableOpacity>
              )}
              {profile.pastedConversation.trim() && (
                <TouchableOpacity
                  onPress={analyzeChat}
                  style={[styles.analyzeBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Feather name="shield" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.analyzeBtnText, { color: colors.primaryForeground }]}>
                    Analyze conversation for red flags
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.deleteBtn, { borderColor: colors.danger + "40" }]}
              >
                <Feather name="trash-2" size={15} color={colors.danger} />
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
          <View style={styles.viewerBackdrop}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUri(null)} hitSlop={12}>
              <Feather name="x" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImg} resizeMode="contain" />}
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, body, colors }: { title: string; body: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 4 }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.foreground }]}>{body}</Text>
    </View>
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  platformBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  platformDot: { width: 7, height: 7, borderRadius: 4 },
  platformLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  linkedBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  linkedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  name: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 2 },
  ageLine: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  concernBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  chatBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  chatLength: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chatPreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 32, alignItems: "center", gap: 8, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  platformRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  platformChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6, marginTop: -4 },
  inputBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 22 },
  actions: { gap: 10, marginTop: 8 },
  phoneActions: { flexDirection: "row", gap: 10 },
  phoneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    paddingVertical: 14,
  },
  phoneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addPhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
  },
  addPhoneBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15 },
  analyzeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 14, paddingVertical: 13 },
  deleteBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 78, height: 78, borderRadius: 12 },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 78,
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoAddText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  galleryImg: { width: 120, height: 160, borderRadius: 14 },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center" },
  viewerClose: { position: "absolute", top: 54, right: 22, zIndex: 2, padding: 6 },
  viewerImg: { width: "100%", height: "82%" },
});
