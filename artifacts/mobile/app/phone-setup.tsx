import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useUser } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import {
  usePhone,
  formatPhone,
  type PhoneEligibility,
  type PhoneNumberRow,
} from "@/hooks/usePhone";

export default function PhoneSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const phone = usePhone();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<PhoneNumberRow | null>(null);
  const [eligibility, setEligibility] = useState<PhoneEligibility | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [realPhone, setRealPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [res, eligibilityResult] = await Promise.all([
          phone.getNumber(),
          phone.getEligibility(),
        ]);
        setEligibility(eligibilityResult);
        if (res.number) {
          setExisting(res.number);
          setAreaCode(res.number.areaCode ?? "");
          setRealPhone(res.number.ownerRealPhone ?? "");
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not load your number.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setError(null);
    if (!existing && eligibility && !eligibility.eligible) {
      setError(
        eligibility.blockingReasons[0] ??
          "Private-number service is not ready yet.",
      );
      return;
    }
    if (!existing && !/^\d{3}$/.test(areaCode.trim())) {
      setError("Enter a 3-digit area code to get a local number.");
      return;
    }
    if (!realPhone.trim()) {
      setError("Enter your real phone number so we can connect your calls.");
      return;
    }
    setSaving(true);
    try {
      const res = await phone.setup({
        areaCode: areaCode.trim() || undefined,
        realPhone: realPhone.trim(),
      });
      setExisting(res.number);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/phone");
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not set up your number.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function handleRelease() {
    Alert.alert(
      "Release private number?",
      "This permanently returns the number to the carrier. It may later be assigned to someone else, and you will no longer receive calls or texts sent to it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release number",
          style: "destructive",
          onPress: async () => {
            setError(null);
            setReleasing(true);
            try {
              await phone.releaseNumber();
              setExisting(null);
              setAreaCode("");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (e: any) {
              setError(e?.message ?? "Could not release your number.");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setReleasing(false);
            }
          },
        },
      ],
    );
  }

  const topPadding = Platform.OS === "web" ? 24 : insets.top + 8;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        padding: 20,
        paddingTop: topPadding,
        paddingBottom: insets.bottom + 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Private line
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {existing ? (
            <View
              style={[styles.numberCard, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="shield"
                size={18}
                color={colors.primaryForeground}
              />
              <Text
                style={[
                  styles.numberLabel,
                  { color: colors.primaryForeground },
                ]}
              >
                Your private number
              </Text>
              <Text
                style={[
                  styles.numberValue,
                  { color: colors.primaryForeground },
                ]}
              >
                {formatPhone(existing.phoneNumber)}
              </Text>
              <Text
                style={[styles.numberSub, { color: colors.primaryForeground }]}
              >
                Matches see this number — your real number stays hidden
              </Text>
            </View>
          ) : (
            <View style={[styles.heroBanner]}>
              <Feather name="phone-call" size={28} color={colors.primary} />
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                Get your private number
              </Text>
              <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
                A real local phone number just for dating apps. Text and call
                matches without ever exposing your real number. Every
                conversation is saved to your vault.
              </Text>
            </View>
          )}

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Feather name="lock" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Calls are recorded for your safety (matches hear a consent notice
              first). Message history and available call recordings are
              accessible only through your authenticated account.
            </Text>
          </View>

          <View
            style={[
              styles.accountCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather
              name={eligibility?.authenticated ? "check-circle" : "user"}
              size={16}
              color={eligibility?.authenticated ? colors.safe : colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountLabel, { color: colors.foreground }]}>Existing LoopIn account</Text>
              <Text style={[styles.accountEmail, { color: colors.mutedForeground }]}>
                {user?.primaryEmailAddress?.emailAddress ?? "Signed-in account"}
              </Text>
              <Text style={[styles.accountStatus, { color: eligibility?.authenticated ? colors.safe : colors.warning }]}>
                {eligibility?.authenticated
                  ? eligibility.eligible
                    ? "Verified — this account can request a private number"
                    : "Account verified — carrier activation is still pending"
                  : "Verifying account…"}
              </Text>
            </View>
          </View>

          {!existing && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Your area code
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.inputPrefix,
                    { color: colors.mutedForeground },
                  ]}
                >
                  +1
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="415"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={3}
                  value={areaCode}
                  onChangeText={setAreaCode}
                />
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                We'll provision a local number in this area code.
              </Text>
            </>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>
            Your real phone number
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={realPhone}
              onChangeText={setRealPhone}
            />
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Kept completely private. Only used to ring your phone when a match
            calls you.
          </Text>

          {error && (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: colors.sosLight, borderColor: colors.sos },
              ]}
            >
              <Feather name="alert-triangle" size={14} color={colors.sos} />
              <Text style={[styles.errorText, { color: colors.sos }]}>
                {error}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={
              saving ||
              releasing ||
              (!existing && eligibility?.eligible === false)
            }
            style={[
              styles.saveBtn,
              {
                backgroundColor:
                  saving || (!existing && eligibility?.eligible === false)
                    ? colors.border
                    : colors.primary,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather
                  name="check"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {existing
                    ? "Save changes"
                    : eligibility?.eligible === false
                      ? "Waiting for carrier approval"
                      : "Get my private number"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {existing && (
            <TouchableOpacity
              onPress={handleRelease}
              disabled={saving || releasing}
              style={[styles.releaseBtn, { borderColor: colors.sos }]}
            >
              {releasing ? (
                <ActivityIndicator color={colors.sos} />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color={colors.sos} />
                  <Text style={[styles.releaseBtnText, { color: colors.sos }]}>
                    Release private number
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { width: 26 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  numberCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 4,
    marginBottom: 18,
  },
  numberLabel: { fontSize: 13, fontFamily: "Inter_500Medium", opacity: 0.9 },
  numberValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  numberSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    opacity: 0.75,
    textAlign: "center",
    marginTop: 4,
  },
  heroBanner: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    marginBottom: 20,
  },
  accountLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  accountEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  accountStatus: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 5 },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    marginTop: 6,
  },
  inputRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputPrefix: { fontSize: 16, fontFamily: "Inter_400Regular" },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", flex: 1 },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 17,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  releaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 12,
  },
  releaseBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
