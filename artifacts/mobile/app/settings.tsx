import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocation } from "@/hooks/useLocation";
import { callLyft, callUber, openApp } from "@/utils/callRide";

function PinSetup({
  currentPin,
  onSet,
  onClear,
}: {
  currentPin: string | null;
  onSet: (pin: string) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");

  function reset() {
    setDraft("");
    setConfirm("");
    setStage("enter");
    setError("");
    setEditing(false);
  }

  function handleNext() {
    if (draft.length !== 6) { setError("Must be exactly 6 digits"); return; }
    setStage("confirm");
    setError("");
  }

  function handleConfirm() {
    if (confirm !== draft) { setError("Codes don't match. Try again."); setConfirm(""); return; }
    onSet(draft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
  }

  if (!editing) {
    return (
      <View>
        {currentPin ? (
          <View style={[pinStyles.ready, { borderColor: "#A78BFA40", backgroundColor: "#0D0D1A" }]}>
            <View style={pinStyles.readyLeft}>
              <Feather name="lock" size={16} color="#A78BFA" />
              <View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E9D5FF" }}>PIN set ✓</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(196,181,253,0.6)", marginTop: 2 }}>
                  {currentPin.length}-digit code configured
                </Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => setEditing(true)} style={[pinStyles.pinBtn, { borderColor: "#A78BFA50" }]}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#A78BFA" }}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onClear(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={[pinStyles.pinBtn, { borderColor: colors.danger + "40" }]}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.danger }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={[pinStyles.setupBtn, { backgroundColor: "#0D0D1A", borderColor: "#A78BFA40" }]}
          >
            <Feather name="lock" size={16} color="#A78BFA" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#A78BFA", flex: 1 }}>Set up 6-digit PIN</Text>
            <Feather name="chevron-right" size={16} color="rgba(167,139,250,0.5)" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[pinStyles.form, { backgroundColor: "#0D0D1A", borderColor: "#A78BFA30" }]}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E9D5FF", marginBottom: 4 }}>
        {stage === "enter" ? "Enter a 6-digit code" : "Confirm your code"}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(196,181,253,0.5)", marginBottom: 12 }}>
        {stage === "enter" ? "Only you will know this." : "Enter the same code again to confirm."}
      </Text>
      {/* PIN dots display */}
      <View style={pinStyles.dots}>
        {Array.from({ length: 6 }).map((_, i) => {
          const val = stage === "enter" ? draft : confirm;
          return (
            <View key={i} style={[pinStyles.dot, { backgroundColor: i < val.length ? "#A78BFA" : "rgba(255,255,255,0.15)" }]} />
          );
        })}
      </View>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        value={stage === "enter" ? draft : confirm}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, 6);
          if (stage === "enter") setDraft(digits);
          else setConfirm(digits);
          setError("");
        }}
        secureTextEntry
        style={[pinStyles.hiddenInput, { color: "transparent", backgroundColor: "transparent" }]}
        autoFocus
        caretHidden
      />
      {error ? <Text style={{ fontSize: 12, color: colors.danger, fontFamily: "Inter_400Regular", marginTop: 4 }}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <TouchableOpacity onPress={reset} style={[pinStyles.actionBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={stage === "enter" ? handleNext : handleConfirm}
          disabled={(stage === "enter" ? draft : confirm).length !== 6}
          style={[pinStyles.actionBtn, { backgroundColor: "#7C3AED", flex: 1, opacity: (stage === "enter" ? draft : confirm).length === 6 ? 1 : 0.4 }]}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            {stage === "enter" ? "Next →" : "Set PIN"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  ready: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  readyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  pinBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, alignItems: "center" },
  setupBtn: { borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  form: { borderWidth: 1, borderRadius: 14, padding: 16 },
  dots: { flexDirection: "row", gap: 12, justifyContent: "center", marginBottom: 14 },
  dot: { width: 13, height: 13, borderRadius: 7 },
  hiddenInput: { position: "absolute", top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  actionBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
});

const CHECK_IN_INTERVALS = [15, 30, 60, 90];
const ESCALATION_DELAYS = [5, 10, 15];

const DATING_APPS = [
  { key: "tinder", label: "Tinder", scheme: "tinder://", web: "https://tinder.com", color: "#FE3C72" },
  { key: "hinge", label: "Hinge", scheme: "hinge://", web: "https://hinge.co", color: "#E8543A" },
  { key: "bumble", label: "Bumble", scheme: "bumble://", web: "https://bumble.com", color: "#FFC629" },
  { key: "okcupid", label: "OkCupid", scheme: "okcupid://", web: "https://okcupid.com", color: "#0073E6" },
] as const;

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

function SettingRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, trustedContacts, addTrustedContact, deleteTrustedContact } = useApp();
  const { fetchOnce, loading: locationLoading } = useLocation();

  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [homeAddressInput, setHomeAddressInput] = useState(settings.homeAddress);

  // Keep the input in sync with the stored address once settings load from
  // storage (or change via "detect home"), so a saved address never appears
  // blank and force the user to re-enter it.
  useEffect(() => {
    setHomeAddressInput(settings.homeAddress);
  }, [settings.homeAddress]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleDetectHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const loc = await fetchOnce();
    if (loc) {
      updateSettings({ homeAddress: loc.address, homeLat: loc.lat, homeLng: loc.lng });
      setHomeAddressInput(loc.address);
    }
  }

  async function handleCallUber() {
    if (!settings.homeLat || !settings.homeLng) {
      Alert.alert("Set home address first", "Go to 'Get Home Safely' and set your home address so Uber knows where to drop you off.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await callUber({
      dropoffLat: settings.homeLat,
      dropoffLng: settings.homeLng,
      dropoffName: "Home",
      dropoffAddress: settings.homeAddress,
    });
  }

  async function handleCallLyft() {
    if (!settings.homeLat || !settings.homeLng) {
      Alert.alert("Set home address first", "Set your home address so Lyft knows where to drop you off.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await callLyft({
      dropoffLat: settings.homeLat,
      dropoffLng: settings.homeLng,
    });
  }

  function handleAddContact() {
    if (!newContactName.trim()) return;
    addTrustedContact({ name: newContactName.trim(), phone: newContactPhone.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewContactName("");
    setNewContactPhone("");
    setAddingContact(false);
  }

  function handleDeleteContact(id: string, name: string) {
    Alert.alert("Remove contact?", `Remove ${name} from your trusted circle?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteTrustedContact(id) },
    ]);
  }

  function saveHomeAddress() {
    updateSettings({ homeAddress: homeAddressInput });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Setup & Safety</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── SAFETY DEFAULTS ── */}
      <SectionHeader title="Safety defaults" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="map-pin"
          label="GPS tracking"
          sublabel="Always save your location to your account"
          right={
            <Switch
              value={settings.gpsTrackingEnabled}
              onValueChange={(v) => updateSettings({ gpsTrackingEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingRow
          icon="navigation"
          label="Location history"
          sublabel="View where you've been"
          onPress={() => router.push("/location-history")}
        />
        <SettingRow
          icon="bell"
          label="App lock"
          sublabel="Require biometrics to open LoopIn"
          right={
            <Switch
              value={settings.appLockEnabled}
              onValueChange={(v) => updateSettings({ appLockEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
          last
        />
      </View>

      {/* Check-in interval */}
      <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>Default check-in interval</Text>
      <View style={styles.chips}>
        {CHECK_IN_INTERVALS.map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => {
              updateSettings({ defaultCheckInIntervalMinutes: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: settings.defaultCheckInIntervalMinutes === v ? colors.primary : colors.surface,
                borderColor: settings.defaultCheckInIntervalMinutes === v ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: settings.defaultCheckInIntervalMinutes === v ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {v} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Escalation delay */}
      <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>Escalation delay after missed check-in</Text>
      <View style={styles.chips}>
        {ESCALATION_DELAYS.map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => {
              updateSettings({ escalationDelayMinutes: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: settings.escalationDelayMinutes === v ? colors.primary : colors.surface,
                borderColor: settings.escalationDelayMinutes === v ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: settings.escalationDelayMinutes === v ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {v} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── DATE NIGHT MODE ── */}
      <SectionHeader title="Date Night Mode" />
      <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
        At your scheduled date time, the app disguises itself as a music player called "Night Sounds". All safety features stay active — just hidden behind innocent labels. Only your 6-digit PIN can exit the mode.
      </Text>

      {/* How it works card */}
      <View style={[styles.card, { backgroundColor: "#0D0D1A", borderColor: "#A78BFA25", marginBottom: 12 }]}>
        {[
          { icon: "play" as const, label: "▶ Play", action: "Confirm I'm Safe (check-in)" },
          { icon: "skip-forward" as const, label: "⏭ Skip", action: "Trigger fake call" },
          { icon: "share-2" as const, label: "↑ Share", action: "Call Uber home" },
          { icon: "heart" as const, label: "♡ Hold 3s", action: "Send SOS to contacts" },
          { icon: "disc" as const, label: "Triple-tap album art", action: "Reveal PIN unlock" },
        ].map((row, i, arr) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
              borderBottomColor: "rgba(167,139,250,0.1)",
            }}
          >
            <Feather name={row.icon} size={14} color="#A78BFA" />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#E9D5FF", width: 120 }}>{row.label}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(196,181,253,0.55)", flex: 1 }}>{row.action}</Text>
          </View>
        ))}
      </View>

      {/* PIN setup */}
      <PinSetup
        currentPin={settings.dateNightPin ?? null}
        onSet={(pin) => updateSettings({ dateNightPin: pin })}
        onClear={() => updateSettings({ dateNightPin: null })}
      />

      {/* Preview button */}
      {settings.dateNightPin && (
        <TouchableOpacity
          onPress={() => router.push("/date-night")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: "#1A1040",
            borderWidth: 1,
            borderColor: "#A78BFA40",
            borderRadius: 14,
            paddingVertical: 14,
            marginTop: 10,
          }}
          activeOpacity={0.85}
        >
          <Feather name="moon" size={16} color="#A78BFA" />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#A78BFA" }}>Preview Date Night Mode</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.rideNote, { color: colors.mutedForeground, marginTop: 6 }]}>
        Tip: enable Date Night Mode when creating a date plan — it activates automatically at your scheduled start time.
      </Text>

      {/* ── TRUSTED CIRCLE ── */}
      <SectionHeader title="Trusted circle" />
      <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
        These contacts are alerted automatically if you miss a check-in.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {trustedContacts.length === 0 && (
          <View style={styles.emptyRow}>
            <Feather name="users" size={20} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No contacts added yet</Text>
          </View>
        )}
        {trustedContacts.map((c, i) => (
          <View
            key={c.id}
            style={[
              styles.contactRow,
              { borderBottomWidth: i < trustedContacts.length - 1 ? 1 : 0, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.contactAvatar, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.contactInitial, { color: colors.primary }]}>
                {c.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
              {c.phone ? (
                <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{c.phone}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${c.phone}`)}
              style={[styles.iconBtn, { backgroundColor: colors.safe + "18" }]}
            >
              <Feather name="phone" size={15} color={colors.safe} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteContact(c.id, c.name)}
              style={[styles.iconBtn, { backgroundColor: colors.danger + "15" }]}
            >
              <Feather name="trash-2" size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {addingContact ? (
          <View style={[styles.addForm, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <TextInput
              placeholder="Name"
              placeholderTextColor={colors.mutedForeground}
              value={newContactName}
              onChangeText={setNewContactName}
              style={[styles.formInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
              style={[styles.formInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <View style={styles.formRow}>
              <TouchableOpacity
                onPress={() => setAddingContact(false)}
                style={[styles.formBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.formBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddContact}
                disabled={!newContactName.trim()}
                style={[styles.formBtn, { backgroundColor: colors.primary, flex: 1 }]}
              >
                <Text style={[styles.formBtnText, { color: colors.primaryForeground }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setAddingContact(true)}
            style={[styles.addBtn, { borderTopWidth: trustedContacts.length > 0 ? 1 : 0, borderTopColor: colors.border }]}
          >
            <Feather name="user-plus" size={16} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add contact</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── GET HOME SAFELY ── */}
      <SectionHeader title="Get home safely" />
      <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
        Set your home address once. One tap calls you a ride directly from your current location.
      </Text>

      {/* Home address */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.addressRow}>
          <View style={styles.addressInputWrap}>
            <Feather name="home" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Your home address"
              placeholderTextColor={colors.mutedForeground}
              value={homeAddressInput}
              onChangeText={setHomeAddressInput}
              onBlur={saveHomeAddress}
              style={[styles.addressInput, { color: colors.foreground }]}
              returnKeyType="done"
              onSubmitEditing={saveHomeAddress}
            />
          </View>
          <TouchableOpacity
            onPress={handleDetectHome}
            disabled={locationLoading || Platform.OS === "web"}
            style={[styles.gpsBtn, { backgroundColor: colors.primary + "18" }]}
          >
            <Feather name="crosshair" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {settings.homeAddress ? (
          <View style={[styles.addressSaved, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Feather name="check-circle" size={13} color={colors.safe} />
            <Text style={[styles.addressSavedText, { color: colors.safe }]}>Home address saved</Text>
          </View>
        ) : null}
      </View>

      {/* Rideshare buttons */}
      <View style={styles.rideRow}>
        <TouchableOpacity
          onPress={handleCallUber}
          style={[styles.rideBtn, { backgroundColor: "#000000", flex: 1 }]}
          activeOpacity={0.85}
        >
          <Feather name="navigation" size={18} color="#FFFFFF" />
          <Text style={styles.rideBtnText}>Call me an Uber</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCallLyft}
          style={[styles.rideBtn, { backgroundColor: "#FF00BF", width: 56 }]}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.rideNote, { color: colors.mutedForeground }]}>
        Opens Uber or Lyft with your current location as pickup and home as drop-off.
      </Text>

      {/* Preferred rideshare */}
      <View style={styles.chips}>
        {(["uber", "lyft"] as const).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => {
              updateSettings({ preferredRideshare: r });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: settings.preferredRideshare === r ? colors.primary : colors.surface,
                borderColor: settings.preferredRideshare === r ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: settings.preferredRideshare === r ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)} preferred
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONNECTED DATING APPS ── */}
      <SectionHeader title="Connected dating apps" />
      <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
        Quick-open your dating apps while LoopIn runs in the background.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {DATING_APPS.map((app, i) => (
          <View
            key={app.key}
            style={[
              styles.appRow,
              { borderBottomWidth: i < DATING_APPS.length - 1 ? 1 : 0, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.appDot, { backgroundColor: app.color }]} />
            <Text style={[styles.appName, { color: colors.foreground }]}>{app.label}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openApp(app.scheme, app.web);
              }}
              style={[styles.openBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            >
              <Feather name="external-link" size={13} color={colors.primary} />
              <Text style={[styles.openBtnText, { color: colors.primary }]}>Open</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
        <Feather name="info" size={14} color={colors.warning} />
        <Text style={[styles.infoText, { color: colors.warning }]}>
          GPS tracking, push notifications, app lock, and ride deep links work fully in Expo Go on your phone. The web preview shows the UI only.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 24,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 10,
    marginTop: -4,
  },
  sublabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: { fontSize: 15, fontFamily: "Inter_700Bold" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addForm: { padding: 14, gap: 10 },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  formRow: { flexDirection: "row", gap: 10 },
  formBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  formBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  addressInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  addressInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  gpsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addressSaved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addressSavedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  rideRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  rideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 18,
  },
  rideBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  rideNote: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  appDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  appName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  openBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
