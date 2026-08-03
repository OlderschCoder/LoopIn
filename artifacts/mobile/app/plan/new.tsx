import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DatePlan, DatingPlatform, TrustedContact } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Step = 0 | 1 | 2 | 3 | 4;

const PLATFORMS: { value: DatingPlatform; label: string; color: string }[] = [
  { value: "tinder", label: "Tinder", color: "#FE3C72" },
  { value: "hinge", label: "Hinge", color: "#E8472B" },
  { value: "bumble", label: "Bumble", color: "#F5C518" },
  { value: "okcupid", label: "OkCupid", color: "#0072EF" },
  { value: "other", label: "Other", color: "#6B7280" },
];

function calcSafetyScore(
  locationType: DatePlan["locationType"],
  transport: DatePlan["transport"],
  trustedContacts: TrustedContact[],
  hasExitPlan: boolean
): number {
  let score = 40;
  if (locationType === "public") score += 25;
  else if (locationType === "semi-public") score += 12;
  if (transport === "own") score += 20;
  else if (transport === "rideshare") score += 15;
  else if (transport === "public-transit") score += 10;
  if (trustedContacts.length > 0) score += 10;
  if (trustedContacts.length >= 2) score += 5;
  if (hasExitPlan) score += 5;
  return Math.min(score, 100);
}

export default function NewPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addDatePlan, addMatchProfile, trustedContacts: savedContacts, addTrustedContact } = useApp();

  const [step, setStep] = useState<Step>(0);

  // Step 0 — Match profile
  const [matchPlatform, setMatchPlatform] = useState<DatingPlatform>("tinder");
  const [matchUsername, setMatchUsername] = useState("");
  const [matchAge, setMatchAge] = useState("");
  const [matchBioNotes, setMatchBioNotes] = useState("");
  const [matchProfileDesc, setMatchProfileDesc] = useState("");
  const [matchConversation, setMatchConversation] = useState("");
  const [matchConcerns, setMatchConcerns] = useState("");

  const [personName, setPersonName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<DatePlan["locationType"]>("public");
  const [transport, setTransport] = useState<DatePlan["transport"]>("own");
  const [dateTime, setDateTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<TrustedContact[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [hasExitPlan, setHasExitPlan] = useState(false);
  const [exitPlan, setExitPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [dateNightMode, setDateNightMode] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function toggleContact(c: TrustedContact) {
    setSelectedContacts((prev) =>
      prev.find((x) => x.id === c.id)
        ? prev.filter((x) => x.id !== c.id)
        : [...prev, c]
    );
  }

  function addNewContact() {
    if (!newContactName.trim()) return;
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const contact: TrustedContact = {
      id: newId,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
    };
    addTrustedContact({ name: contact.name, phone: contact.phone });
    setSelectedContacts((prev) => [...prev, contact]);
    setNewContactName("");
    setNewContactPhone("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSave() {
    const score = calcSafetyScore(locationType, transport, selectedContacts, hasExitPlan);
    const resolvedName = personName.trim() || matchUsername.trim() || "Unknown";

    const planId = (() => {
      let id = "";
      addDatePlan({
        personName: resolvedName,
        locationName: locationName.trim() || "TBD",
        locationType,
        transport,
        dateTime: dateTime || new Date().toISOString(),
        endTime: endTime || "",
        trustedContacts: selectedContacts,
        hasExitPlan,
        exitPlan,
        notes,
        safetyScore: score,
        status: "upcoming",
        dateNightMode,
      });
      return id;
    })();

    // Save match profile if any match info was entered
    if (matchUsername.trim() || matchBioNotes.trim() || matchConversation.trim() || matchConcerns.trim() || matchProfileDesc.trim()) {
      addMatchProfile({
        platform: matchPlatform,
        username: matchUsername.trim() || resolvedName,
        age: matchAge.trim(),
        bioNotes: matchBioNotes.trim(),
        profileDescription: matchProfileDesc.trim(),
        pastedConversation: matchConversation.trim(),
        concernsNoted: matchConcerns.trim(),
        datePlanId: planId || undefined,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const score = calcSafetyScore(locationType, transport, selectedContacts, hasExitPlan);
  const scoreColor = score >= 75 ? colors.safe : score >= 50 ? colors.warning : colors.danger;

  const LOCATION_TYPES: { value: DatePlan["locationType"]; label: string; desc: string }[] = [
    { value: "public", label: "Public place", desc: "Coffee shop, restaurant, park" },
    { value: "semi-public", label: "Semi-public", desc: "Bar, gallery, venue" },
    { value: "private", label: "Private", desc: "Home, private space" },
  ];

  const TRANSPORTS: { value: DatePlan["transport"]; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { value: "own", label: "My own", icon: "navigation-2" },
    { value: "rideshare", label: "Rideshare", icon: "navigation" },
    { value: "public-transit", label: "Transit", icon: "map" },
    { value: "walk", label: "Walk", icon: "activity" },
    { value: "date-drives", label: "Date drives", icon: "user" },
  ];

  const steps: { title: string; content: React.ReactNode }[] = [
    {
      title: "Match Profile",
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Save info about who you're meeting — this stays private on your device. Skip any fields you don't need.
          </Text>

          {/* Platform selector */}
          <Text style={[styles.label, { color: colors.foreground }]}>Where did you match?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => { setMatchPlatform(p.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  styles.platformChip,
                  {
                    backgroundColor: matchPlatform === p.value ? p.color + "20" : colors.card,
                    borderColor: matchPlatform === p.value ? p.color : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: matchPlatform === p.value ? p.color : colors.mutedForeground }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Username or display name</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="@their_name" placeholderTextColor={colors.mutedForeground} value={matchUsername} onChangeText={setMatchUsername} />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Age (optional)</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="e.g. 28" placeholderTextColor={colors.mutedForeground} value={matchAge} onChangeText={setMatchAge} keyboardType="number-pad" maxLength={3} />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Bio / profile notes</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 80 }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="Key things from their bio, photos, vibe..." placeholderTextColor={colors.mutedForeground} value={matchBioNotes} onChangeText={setMatchBioNotes} multiline textAlignVertical="top" />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Paste your conversation</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground, marginTop: -8, marginBottom: 8 }]}>
            Copy messages from the dating app and paste here. You can run AI analysis after saving.
          </Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 110 }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="Paste chat messages here..." placeholderTextColor={colors.mutedForeground} value={matchConversation} onChangeText={setMatchConversation} multiline textAlignVertical="top" />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Any concerns or red flags?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 72 }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="Gut feelings, inconsistencies, anything off..." placeholderTextColor={colors.mutedForeground} value={matchConcerns} onChangeText={setMatchConcerns} multiline textAlignVertical="top" />
          </View>
        </View>
      ),
    },
    {
      title: "Who & When",
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.label, { color: colors.foreground }]}>Who are you meeting?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Their name or username..."
              placeholderTextColor={colors.mutedForeground}
              value={personName}
              onChangeText={setPersonName}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Where?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Restaurant name, neighborhood..."
              placeholderTextColor={colors.mutedForeground}
              value={locationName}
              onChangeText={setLocationName}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>What time?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. Saturday 7:00 PM"
              placeholderTextColor={colors.mutedForeground}
              value={dateTime}
              onChangeText={setDateTime}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Planned end time?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="e.g. 9:00 PM"
              placeholderTextColor={colors.mutedForeground}
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>
      ),
    },
    {
      title: "Safety Setup",
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.label, { color: colors.foreground }]}>Type of location</Text>
          {LOCATION_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt.value}
              onPress={() => {
                setLocationType(lt.value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.optionCard,
                {
                  backgroundColor: locationType === lt.value ? colors.primary + "10" : colors.card,
                  borderColor: locationType === lt.value ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.optionLeft}>
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                  {lt.label}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  {lt.desc}
                </Text>
              </View>
              {locationType === lt.value && (
                <Feather name="check-circle" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { color: colors.foreground }]}>How are you getting there?</Text>
          <View style={styles.transportRow}>
            {TRANSPORTS.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => {
                  setTransport(t.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.transportChip,
                  {
                    backgroundColor: transport === t.value ? colors.primary : colors.card,
                    borderColor: transport === t.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={t.icon}
                  size={14}
                  color={transport === t.value ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.transportText,
                    { color: transport === t.value ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ),
    },
    {
      title: "Trusted Circle",
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Select contacts to notify before your date. They'll know who you're meeting, where, and when.
          </Text>

          {savedContacts.map((c) => {
            const selected = !!selectedContacts.find((x) => x.id === c.id);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => toggleContact(c)}
                style={[
                  styles.contactCard,
                  {
                    backgroundColor: selected ? colors.primary + "10" : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.contactAvatar, { backgroundColor: selected ? colors.primary : colors.surface }]}>
                  <Text style={[styles.contactInitial, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
                  {c.phone && (
                    <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{c.phone}</Text>
                  )}
                </View>
                {selected && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          <View style={[styles.newContactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.newContactTitle, { color: colors.foreground }]}>Add new contact</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Name..."
                placeholderTextColor={colors.mutedForeground}
                value={newContactName}
                onChangeText={setNewContactName}
              />
            </View>
            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Phone number (optional)..."
                placeholderTextColor={colors.mutedForeground}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              onPress={addNewContact}
              disabled={!newContactName.trim()}
              style={[
                styles.addContactBtn,
                { backgroundColor: newContactName.trim() ? colors.primary : colors.border },
              ]}
            >
              <Feather name="user-plus" size={15} color={colors.primaryForeground} />
              <Text style={[styles.addContactBtnText, { color: colors.primaryForeground }]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ),
    },
    {
      title: "Exit Plan",
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Having a planned exit gives you confidence and control. Even if you never need it.
          </Text>

          <TouchableOpacity
            onPress={() => {
              setHasExitPlan(!hasExitPlan);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.exitToggle,
              {
                backgroundColor: hasExitPlan ? colors.primary + "10" : colors.card,
                borderColor: hasExitPlan ? colors.primary : colors.border,
              },
            ]}
          >
            <View>
              <Text style={[styles.exitToggleTitle, { color: colors.foreground }]}>
                I have an exit plan
              </Text>
              <Text style={[styles.exitToggleDesc, { color: colors.mutedForeground }]}>
                A code word, excuse, or friend on standby
              </Text>
            </View>
            <View
              style={[
                styles.checkBox,
                { backgroundColor: hasExitPlan ? colors.primary : colors.surface, borderColor: hasExitPlan ? colors.primary : colors.border },
              ]}
            >
              {hasExitPlan && <Feather name="check" size={14} color={colors.primaryForeground} />}
            </View>
          </TouchableOpacity>

          {hasExitPlan && (
            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 80 }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Describe your exit plan (optional)..."
                placeholderTextColor={colors.mutedForeground}
                value={exitPlan}
                onChangeText={setExitPlan}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>Any other notes?</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 80 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Anything else to remember..."
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Date Night Mode toggle */}
          <TouchableOpacity
            onPress={() => {
              setDateNightMode((d) => !d);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.exitToggle,
              {
                backgroundColor: dateNightMode ? "#0D0D1A" : colors.card,
                borderColor: dateNightMode ? "#A78BFA" : colors.border,
                marginTop: 8,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <Feather name="moon" size={14} color={dateNightMode ? "#A78BFA" : colors.mutedForeground} />
                <Text style={[styles.exitToggleTitle, { color: dateNightMode ? "#E9D5FF" : colors.foreground }]}>
                  Date Night Mode
                </Text>
              </View>
              <Text style={[styles.exitToggleDesc, { color: dateNightMode ? "rgba(196,181,253,0.6)" : colors.mutedForeground }]}>
                App disguises as a music player at your date start time. Requires a PIN set in Settings.
              </Text>
            </View>
            <View
              style={[
                styles.checkBox,
                { backgroundColor: dateNightMode ? "#A78BFA" : colors.surface, borderColor: dateNightMode ? "#A78BFA" : colors.border },
              ]}
            >
              {dateNightMode && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          {/* Safety score preview */}
          <View style={[styles.scorePreview, { backgroundColor: scoreColor + "12", borderColor: scoreColor + "30" }]}>
            <Text style={[styles.scorePreviewLabel, { color: scoreColor }]}>Safety score</Text>
            <Text style={[styles.scorePreviewValue, { color: scoreColor }]}>{score}%</Text>
          </View>
        </View>
      ),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? 67 : topPad) + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {steps[step].title}
        </Text>
        <Text style={[styles.stepCounter, { color: colors.mutedForeground }]}>
          {step + 1}/{steps.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / steps.length) * 100}%` as `${number}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 120 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {steps[step].content}
      </ScrollView>

      {/* Navigation */}
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
          },
        ]}
      >
        {step > 0 ? (
          <TouchableOpacity
            onPress={() => setStep((s) => (s - 1) as Step)}
            style={[styles.backBtn, { borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}

        {step < steps.length - 1 ? (
          <TouchableOpacity
            onPress={() => {
              setStep((s) => (s + 1) as Step);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>
              Continue
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="shield" size={18} color={colors.primaryForeground} />
            <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>
              Save plan
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  stepCounter: { fontSize: 14, fontFamily: "Inter_400Regular" },
  progressBar: { height: 3 },
  progressFill: { height: 3 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  stepContent: { gap: 4 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 14, marginBottom: 8 },
  sectionDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  platformChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  inputBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  optionLeft: { flex: 1 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  transportRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  transportText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  contactPhone: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  newContactCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  newContactTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  addContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  addContactBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  exitToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  exitToggleTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  exitToggleDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scorePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  scorePreviewLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scorePreviewValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
