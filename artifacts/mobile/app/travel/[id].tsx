import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTravel } from "@/context/TravelContext";
import { useColors } from "@/hooks/useColors";
import { useLocation } from "@/hooks/useLocation";
import type { TripDetail, TravelDocumentType } from "@/types/travel";

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  flight: "send", hotel: "home", rental_car: "truck", ground_transfer: "navigation", activity: "calendar",
};
const DOCUMENT_TYPES: Array<{ value: TravelDocumentType; label: string }> = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "visa", label: "Visa" },
  { value: "insurance", label: "Insurance" },
  { value: "booking", label: "Booking" },
];

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export default function TravelTripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { getTrip, confirmCheckpoint, refreshItineraryItem, uploadDocument, openDocument, setDocumentEmergencyRelease, deleteDocument, requireBiometric } = useTravel();
  const { location, fetchOnce } = useLocation();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [docType, setDocType] = useState<TravelDocumentType>("passport");
  const [docEmergency, setDocEmergency] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try { setTrip(await getTrip(id)); }
    catch (cause) { Alert.alert("Trip unavailable", cause instanceof Error ? cause.message : "Could not load trip"); }
    finally { setLoading(false); }
  }, [getTrip, id]);

  useEffect(() => { void load(); }, [load]);

  async function markSafe(checkpointId: string) {
    setWorkingId(checkpointId);
    try {
      const current = location ?? await fetchOnce();
      await confirmCheckpoint(checkpointId, current ? { lat: current.lat, lng: current.lng, locationLabel: current.address } : {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (cause) { Alert.alert("Check-in failed", cause instanceof Error ? cause.message : "Try again"); }
    finally { setWorkingId(null); }
  }

  async function refreshItem(itemId: string) {
    setWorkingId(itemId);
    try { await refreshItineraryItem(itemId); await load(); }
    catch (cause) { Alert.alert("Live update needs attention", cause instanceof Error ? cause.message : "Could not refresh this leg"); }
    finally { setWorkingId(null); }
  }

  async function addDocument() {
    if (Platform.OS === "web") { Alert.alert("Mobile only", "Encrypted travel documents can only be added from the mobile app."); return; }
    const allowed = await requireBiometric("Add encrypted travel document");
    if (!allowed) { Alert.alert("Biometrics required", "Set up device biometrics before adding identity documents."); return; }
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    setWorkingId("document");
    try {
      await uploadDocument(id, { uri: file.uri, name: file.name, mimeType: file.mimeType ?? "application/octet-stream" }, docType, docEmergency);
      await load();
    } catch (cause) { Alert.alert("Document not saved", cause instanceof Error ? cause.message : "Try again"); }
    finally { setWorkingId(null); }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  if (loading || !trip) return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  const pendingCheckpoints = trip.checkpoints.filter((checkpoint) => checkpoint.status === "scheduled" || checkpoint.status === "waiting");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{trip.name}</Text>
        <TouchableOpacity onPress={load}><Feather name="refresh-cw" size={19} color={colors.primary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 50 }}>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroEyebrow}>LOOPIN TRAVEL</Text>
          <Text style={styles.heroTitle}>{trip.destination}</Text>
          <Text style={styles.heroDate}>{new Date(trip.startAt).toLocaleDateString()} – {new Date(trip.endAt).toLocaleDateString()}</Text>
          <View style={styles.heroMeta}><Feather name="users" size={13} color="rgba(255,255,255,0.75)" /><Text style={styles.heroMetaText}>{trip.contactGroup?.contacts.length ?? 0} Travel contacts</Text><Feather name="wifi" size={13} color="rgba(255,255,255,0.75)" /><Text style={styles.heroMetaText}>{trip.providerFreshAt ? `Updated ${new Date(trip.providerFreshAt).toLocaleTimeString()}` : "Manual schedule"}</Text></View>
        </View>

        {pendingCheckpoints[0] && <View style={[styles.checkCard, { backgroundColor: pendingCheckpoints[0].status === "waiting" ? colors.warning + "12" : colors.safe + "10", borderColor: pendingCheckpoints[0].status === "waiting" ? colors.warning : colors.safe + "55" }]}>
          <View style={{ flex: 1 }}><Text style={[styles.cardEyebrow, { color: pendingCheckpoints[0].status === "waiting" ? colors.warning : colors.safe }]}>NEXT SAFETY CHECK</Text><Text style={[styles.checkTitle, { color: colors.foreground }]}>{pendingCheckpoints[0].title}</Text><Text style={[styles.checkTime, { color: colors.mutedForeground }]}>{formatTime(pendingCheckpoints[0].dueAt)} · {pendingCheckpoints[0].graceMinutes} min grace</Text></View>
          <TouchableOpacity disabled={workingId === pendingCheckpoints[0].id} onPress={() => markSafe(pendingCheckpoints[0].id)} style={[styles.safeBtn, { backgroundColor: colors.safe }]}>{workingId === pendingCheckpoints[0].id ? <ActivityIndicator color="#fff" /> : <><Feather name="check" size={17} color="#fff" /><Text style={styles.safeBtnText}>I’m Safe</Text></>}</TouchableOpacity>
        </View>}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Itinerary</Text>
        {trip.items.map((item, index) => {
          const changed = item.expectedStartAt !== item.scheduledStartAt || item.expectedEndAt !== item.scheduledEndAt;
          return <View key={item.id} style={styles.timelineRow}>
            <View style={styles.timelineRail}><View style={[styles.dot, { backgroundColor: colors.primary }]} />{index < trip.items.length - 1 && <View style={[styles.line, { backgroundColor: colors.border }]} />}</View>
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.itemHeader}><View style={[styles.itemIcon, { backgroundColor: colors.primary + "15" }]}><Feather name={TYPE_ICON[item.type] ?? "calendar"} size={16} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.itemPlace, { color: colors.mutedForeground }]}>{item.originName && item.destinationName ? `${item.originName} → ${item.destinationName}` : item.locationName}</Text></View>{["flight", "ground_transfer"].includes(item.type) && <TouchableOpacity disabled={workingId === item.id} onPress={() => refreshItem(item.id)}><Feather name="refresh-cw" size={16} color={colors.primary} /></TouchableOpacity>}</View>
              <Text style={[styles.expectedTime, { color: changed ? colors.primary : colors.foreground }]}>Expected: {formatTime(item.expectedStartAt)}{item.expectedEndAt ? ` – ${formatTime(item.expectedEndAt)}` : ""}</Text>
              {changed && <Text style={[styles.originalTime, { color: colors.mutedForeground }]}>Original booking: {formatTime(item.scheduledStartAt)}{item.scheduledEndAt ? ` – ${formatTime(item.scheduledEndAt)}` : ""}</Text>}
              {item.confirmationReference && <Text style={[styles.confirmation, { color: colors.mutedForeground }]}>Confirmation: •••{item.confirmationReference.slice(-4)}</Text>}
            </View>
          </View>;
        })}

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 14 }]}>Travel group</Text>
        <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{trip.contactGroup?.contacts.map((contact) => {
          const delivery = [...trip.deliveries].reverse().find((entry) => entry.contactId === contact.id);
          return <View key={contact.id} style={styles.contactRow}><View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}><Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{contact.name.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={[styles.contactName, { color: colors.foreground }]}>{contact.name}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{contact.phoneE164}{delivery ? ` · SMS ${delivery.status}` : " · No alert sent"}</Text></View>{contact.isPrimary && <Text style={[styles.primary, { color: colors.primary }]}>PRIMARY</Text>}</View>;
        }) ?? <Text style={{ color: colors.mutedForeground }}>No Travel group assigned</Text>}</View>
        {trip.escalations.some((entry) => entry.acknowledgedAt) && <View style={[styles.ackRow, { backgroundColor: colors.safe + "12" }]}><Feather name="check-circle" size={15} color={colors.safe} /><Text style={{ color: colors.safe, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Travel contact acknowledgement recorded</Text></View>}

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Encrypted documents</Text><Feather name="shield" size={18} color={colors.safe} /></View>
        <Text style={[styles.docNote, { color: colors.mutedForeground }]}>Biometrics protect traveler access. Only items marked for release appear in an acknowledged emergency portal.</Text>
        {trip.documents.map((document) => <View key={document.id} style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}><TouchableOpacity onPress={() => openDocument(document.id, document.mimeType).catch((cause) => Alert.alert("Document", cause.message))} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}><View style={[styles.itemIcon, { backgroundColor: colors.safe + "15" }]}><Feather name="file-text" size={16} color={colors.safe} /></View><View style={{ flex: 1 }}><Text style={[styles.contactName, { color: colors.foreground }]}>{document.displayName}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{document.type.replace("_", " ")} · {Math.ceil(document.sizeBytes / 1024)} KB</Text></View></TouchableOpacity><View style={{ alignItems: "center" }}><Switch value={document.emergencyRelease} onValueChange={async (enabled) => { await setDocumentEmergencyRelease(document.id, enabled); await load(); }} trackColor={{ false: colors.border, true: colors.primary }} /><Text style={{ color: colors.mutedForeground, fontSize: 9 }}>RELEASE</Text></View><TouchableOpacity onPress={() => Alert.alert("Delete document?", "This permanently removes the encrypted copy.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteDocument(document.id); await load(); } }])}><Feather name="trash-2" size={16} color={colors.danger} /></TouchableOpacity></View>)}
        <View style={styles.docTypeRow}>{DOCUMENT_TYPES.map((type) => <TouchableOpacity key={type.value} onPress={() => setDocType(type.value)} style={[styles.docType, { backgroundColor: docType === type.value ? colors.primary : colors.surface, borderColor: docType === type.value ? colors.primary : colors.border }]}><Text style={{ color: docType === type.value ? colors.primaryForeground : colors.mutedForeground, fontSize: 11 }}>{type.label}</Text></TouchableOpacity>)}</View>
        <View style={[styles.releaseRow, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.contactName, { color: colors.foreground }]}>Authorize emergency release</Text><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Can be changed later</Text></View><Switch value={docEmergency} onValueChange={setDocEmergency} trackColor={{ false: colors.border, true: colors.primary }} /></View>
        <TouchableOpacity disabled={workingId === "document"} onPress={addDocument} style={[styles.addDoc, { backgroundColor: colors.primary }]}>{workingId === "document" ? <ActivityIndicator color={colors.primaryForeground} /> : <><Feather name="lock" size={17} color={colors.primaryForeground} /><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Add encrypted document</Text></>}</TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, centered: { flex: 1, justifyContent: "center", alignItems: "center" }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 }, headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", maxWidth: "70%" },
  hero: { borderRadius: 22, padding: 20, marginBottom: 14 }, heroEyebrow: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 }, heroTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 }, heroDate: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 3 }, heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 14 }, heroMetaText: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginRight: 7 },
  checkCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 22 }, cardEyebrow: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 }, checkTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 2 }, checkTime: { fontSize: 11, marginTop: 2 }, safeBtn: { flexDirection: "row", gap: 5, alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }, safeBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 }, timelineRow: { flexDirection: "row" }, timelineRail: { width: 24, alignItems: "center" }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 17 }, line: { width: 2, flex: 1, marginVertical: 3 }, itemCard: { flex: 1, borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 10 }, itemHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, itemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }, itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" }, itemPlace: { fontSize: 11, marginTop: 2 }, expectedTime: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 10 }, originalTime: { fontSize: 11, textDecorationLine: "line-through", marginTop: 3 }, confirmation: { fontSize: 10, marginTop: 7 },
  groupCard: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, marginBottom: 24 }, contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 }, avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, contactName: { fontSize: 13, fontFamily: "Inter_600SemiBold" }, primary: { fontSize: 9, fontFamily: "Inter_700Bold" },
  ackRow: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, padding: 11, marginTop: -14, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }, docNote: { fontSize: 12, lineHeight: 17, marginBottom: 12 }, docCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 8 }, docTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }, docType: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 6 }, releaseRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 13, padding: 12, marginTop: 10 }, addDoc: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 10 },
});
