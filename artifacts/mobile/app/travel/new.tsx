import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTravel } from "@/context/TravelContext";
import { useColors } from "@/hooks/useColors";
import type { ItineraryItemType, NewTripPayload } from "@/types/travel";

type DraftItem = NewTripPayload["items"][number];
const ITEM_TYPES: Array<{ value: ItineraryItemType; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { value: "flight", label: "Flight", icon: "send" },
  { value: "hotel", label: "Hotel", icon: "home" },
  { value: "rental_car", label: "Rental car", icon: "truck" },
  { value: "ground_transfer", label: "Ground", icon: "navigation" },
  { value: "activity", label: "Activity", icon: "calendar" },
];

function localInputToIso(value: string, timeZone: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) throw new Error("Use a date like 2026-10-04 14:30");
  const [, y, m, d, hour, minute] = match;
  const localClock = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hour), Number(minute));
  let instant = localClock;
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
    const represented = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
    instant += localClock - represented;
  }
  const resolved = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant));
  if (resolved !== `${y}-${m}-${d} ${hour}:${minute}`) throw new Error("That local time does not exist in the selected timezone because of a clock change");
  return new Date(instant).toISOString();
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
    </View>
  );
}

export default function NewTravelTripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { contactGroups, createContactGroup, createTrip, resolveFlight } = useTravel();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [groupId, setGroupId] = useState<string | null>(contactGroups[0]?.id ?? null);
  const [groupName, setGroupName] = useState("Travel group");
  const [contacts, setContacts] = useState([{ name: "", phone: "", isPrimary: true }]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemType, setItemType] = useState<ItineraryItemType>("flight");
  const [itemTitle, setItemTitle] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [itemOrigin, setItemOrigin] = useState("");
  const [itemDestination, setItemDestination] = useState("");
  const [itemStart, setItemStart] = useState("");
  const [itemEnd, setItemEnd] = useState("");
  const [itemConfirmation, setItemConfirmation] = useState("");
  const [itemTimezone, setItemTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [resolving, setResolving] = useState(false);
  const [customCheckTitle, setCustomCheckTitle] = useState("");
  const [customCheckAt, setCustomCheckAt] = useState("");
  const [dailyCheckTime, setDailyCheckTime] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function addItem() {
    try {
      let next: DraftItem = {
        type: itemType,
        title: itemTitle.trim() || ITEM_TYPES.find((item) => item.value === itemType)!.label,
        locationName: itemLocation.trim() || undefined,
        originName: itemOrigin.trim() || undefined,
        destinationName: itemDestination.trim() || undefined,
        scheduledStartAt: localInputToIso(itemStart, itemTimezone),
        scheduledEndAt: itemEnd.trim() ? localInputToIso(itemEnd, itemTimezone) : null,
        timezone: itemTimezone,
        sequence: items.length,
        confirmationReference: itemConfirmation.trim() || undefined,
      };
      if (itemType === "flight") {
        setResolving(true);
        const flightDate = itemStart.trim().slice(0, 10);
        const matches = await resolveFlight({ ident: next.title, date: flightDate, origin: next.originName, destination: next.destinationName });
        if (matches.length !== 1) throw new Error(matches.length ? "More than one flight matched; add origin and destination airport codes" : "Flight was not found");
        const flight = matches[0];
        next = {
          ...next,
          title: flight.ident,
          originName: flight.originCode,
          destinationName: flight.destinationCode,
          scheduledStartAt: flight.scheduledOut,
          scheduledEndAt: flight.scheduledIn,
          expectedStartAt: flight.expectedOut,
          expectedEndAt: flight.expectedIn,
          provider: "flightaware",
          providerReference: flight.providerReference,
          providerData: flight.raw,
        };
      }
      setItems((current) => [...current, next]);
      setItemTitle(""); setItemLocation(""); setItemOrigin(""); setItemDestination(""); setItemStart(""); setItemEnd(""); setItemConfirmation("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (cause) {
      Alert.alert("Itinerary item", cause instanceof Error ? cause.message : "Could not add item");
    } finally {
      setResolving(false);
    }
  }

  async function saveTrip() {
    try {
      setSaving(true);
      const startAt = localInputToIso(start, timezone);
      const endAt = localInputToIso(end, timezone);
      let selectedGroupId = groupId;
      if (!selectedGroupId) {
        const validContacts = contacts.filter((contact) => contact.name.trim() && contact.phone.trim());
        if (!validContacts.length) throw new Error("Add at least one Travel contact");
        selectedGroupId = (await createContactGroup(groupName.trim() || "Travel group", validContacts)).id;
      }
      const checkpoints: NewTripPayload["checkpoints"] = items.flatMap((item, index): NewTripPayload["checkpoints"] => {
        if (item.type === "hotel") return [{ itineraryItemClientIndex: index, kind: "hotel_arrival" as const, title: `${item.title}: arrived safely`, dueAt: item.scheduledStartAt, timezone: item.timezone, graceMinutes: 10 }];
        if (item.type === "activity") return [{ itineraryItemClientIndex: index, kind: "custom" as const, title: `${item.title}: I'm safe`, dueAt: item.scheduledEndAt ?? item.scheduledStartAt, timezone: item.timezone, graceMinutes: 10 }];
        return [
          { itineraryItemClientIndex: index, kind: "departure" as const, title: `${item.title}: departing safely`, dueAt: item.scheduledStartAt, timezone: item.timezone, graceMinutes: 10 },
          { itineraryItemClientIndex: index, kind: "arrival" as const, title: `${item.title}: arrived safely`, dueAt: item.scheduledEndAt ?? item.scheduledStartAt, timezone: item.timezone, graceMinutes: 10 },
        ];
      });
      if (/^\d{2}:\d{2}$/.test(dailyCheckTime.trim())) {
        const firstDay = start.trim().slice(0, 10);
        const lastDay = end.trim().slice(0, 10);
        for (let cursor = new Date(`${firstDay}T12:00:00Z`); cursor <= new Date(`${lastDay}T12:00:00Z`); cursor = new Date(cursor.getTime() + 86_400_000)) {
          const day = cursor.toISOString().slice(0, 10);
          const dueAt = localInputToIso(`${day} ${dailyCheckTime.trim()}`, timezone);
          if (dueAt >= startAt && dueAt <= endAt) checkpoints.push({ kind: "daily", title: "Daily travel wellness check", dueAt, timezone, fixed: true, graceMinutes: 10 });
        }
      }
      if (customCheckTitle.trim() && customCheckAt.trim()) checkpoints.push({ kind: "custom", title: customCheckTitle.trim(), dueAt: localInputToIso(customCheckAt, timezone), timezone, fixed: true, graceMinutes: 10 });
      const trip = await createTrip({ name: name.trim(), destination: destination.trim(), homeTimezone: timezone, startAt, endAt, contactGroupId: selectedGroupId, items, checkpoints });
      router.replace(`/travel/${trip.id}`);
    } catch (cause) {
      Alert.alert("Trip not saved", cause instanceof Error ? cause.message : "Check the trip details and try again");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = step === 0 ? !!name.trim() && !!destination.trim() && !!start.trim() && !!end.trim() : step === 1 ? !!groupId || contacts.some((contact) => contact.name.trim() && contact.phone.trim()) : true;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Plan a trip</Text>
        <Text style={[styles.stepCount, { color: colors.mutedForeground }]}>{step + 1}/4</Text>
      </View>
      <View style={[styles.progress, { backgroundColor: colors.border }]}><View style={{ width: `${(step + 1) * 25}%`, height: 3, backgroundColor: colors.primary }} /></View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
        {step === 0 && <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Where are you going?</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>Trip times stay preserved even when live delays change your expected schedule.</Text>
          <Field label="Trip name" value={name} onChangeText={setName} placeholder="Tokyo conference" />
          <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="Tokyo, Japan" />
          <Field label="Starts" value={start} onChangeText={setStart} placeholder="2026-10-04 08:00" />
          <Field label="Ends" value={end} onChangeText={setEnd} placeholder="2026-10-10 18:00" />
          <Field label="Home timezone" value={timezone} onChangeText={setTimezone} placeholder="America/Chicago" />
        </>}
        {step === 1 && <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Travel group</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>Travel contacts are separate from your general trusted circle.</Text>
          {contactGroups.map((group) => <TouchableOpacity key={group.id} onPress={() => setGroupId(group.id)} style={[styles.option, { backgroundColor: groupId === group.id ? colors.primary + "12" : colors.card, borderColor: groupId === group.id ? colors.primary : colors.border }]}><View><Text style={[styles.optionTitle, { color: colors.foreground }]}>{group.name}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{group.contacts.length} contact{group.contacts.length === 1 ? "" : "s"}</Text></View>{groupId === group.id && <Feather name="check" color={colors.primary} size={18} />}</TouchableOpacity>)}
          <TouchableOpacity onPress={() => setGroupId(null)} style={[styles.option, { backgroundColor: !groupId ? colors.primary + "12" : colors.card, borderColor: !groupId ? colors.primary : colors.border }]}><Text style={[styles.optionTitle, { color: colors.foreground }]}>Create a new Travel group</Text>{!groupId && <Feather name="check" color={colors.primary} size={18} />}</TouchableOpacity>
          {!groupId && <>
            <Field label="Group name" value={groupName} onChangeText={setGroupName} placeholder="Japan trip contacts" />
            {contacts.map((contact, index) => <View key={index} style={[styles.contactDraft, { borderColor: colors.border }]}><Field label={index === 0 ? "Primary contact name" : "Contact name"} value={contact.name} onChangeText={(value) => setContacts((current) => current.map((entry, i) => i === index ? { ...entry, name: value } : entry))} placeholder="Alex" /><Field label="Mobile number" value={contact.phone} onChangeText={(value) => setContacts((current) => current.map((entry, i) => i === index ? { ...entry, phone: value } : entry))} placeholder="+1 555 555 0123" /></View>)}
            <TouchableOpacity onPress={() => setContacts((current) => [...current, { name: "", phone: "", isPrimary: false }])} style={styles.inlineButton}><Feather name="user-plus" size={15} color={colors.primary} /><Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Add secondary contact</Text></TouchableOpacity>
          </>}
        </>}
        {step === 2 && <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Itinerary</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>Flights use live status. Hotels, cars, transfers, and activities remain under your control.</Text>
          {items.map((item, index) => <View key={`${item.title}-${index}`} style={[styles.savedItem, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={ITEM_TYPES.find((type) => type.value === item.type)!.icon} size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{new Date(item.expectedStartAt ?? item.scheduledStartAt).toLocaleString()}</Text></View><TouchableOpacity onPress={() => setItems((current) => current.filter((_, i) => i !== index))}><Feather name="trash-2" size={16} color={colors.danger} /></TouchableOpacity></View>)}
          <View style={styles.typeRow}>{ITEM_TYPES.map((type) => <TouchableOpacity key={type.value} onPress={() => setItemType(type.value)} style={[styles.typeChip, { backgroundColor: itemType === type.value ? colors.primary : colors.surface, borderColor: itemType === type.value ? colors.primary : colors.border }]}><Feather name={type.icon} size={13} color={itemType === type.value ? colors.primaryForeground : colors.mutedForeground} /><Text style={{ color: itemType === type.value ? colors.primaryForeground : colors.mutedForeground, fontSize: 12 }}>{type.label}</Text></TouchableOpacity>)}</View>
          <Field label={itemType === "flight" ? "Flight number" : "Title"} value={itemTitle} onChangeText={setItemTitle} placeholder={itemType === "flight" ? "AA123" : "Hotel check-in"} />
          {itemType === "flight" || itemType === "ground_transfer" ? <><Field label="Origin" value={itemOrigin} onChangeText={setItemOrigin} placeholder={itemType === "flight" ? "ORD" : "Airport"} /><Field label="Destination" value={itemDestination} onChangeText={setItemDestination} placeholder={itemType === "flight" ? "NRT" : "Hotel"} /></> : <Field label="Location" value={itemLocation} onChangeText={setItemLocation} placeholder="Address or venue" />}
          <Field label="Scheduled start" value={itemStart} onChangeText={setItemStart} placeholder="2026-10-04 08:00" />
          <Field label="Scheduled end" value={itemEnd} onChangeText={setItemEnd} placeholder="2026-10-04 10:30" />
          <Field label="Local timezone" value={itemTimezone} onChangeText={setItemTimezone} placeholder="Asia/Tokyo" />
          <Field label="Confirmation (optional)" value={itemConfirmation} onChangeText={setItemConfirmation} placeholder="Booking reference" />
          <TouchableOpacity disabled={resolving || !itemStart.trim()} onPress={addItem} style={[styles.addItemButton, { backgroundColor: colors.primary, opacity: resolving || !itemStart.trim() ? 0.5 : 1 }]}>{resolving ? <ActivityIndicator color={colors.primaryForeground} /> : <><Feather name="plus" size={17} color={colors.primaryForeground} /><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Add to itinerary</Text></>}</TouchableOpacity>
        </>}
        {step === 3 && <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Safety checkpoints</Text>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>LoopIn adds departure and arrival checks around travel legs. Live delays move eligible checks, while daily and fixed checks stay put.</Text>
          {items.map((item, index) => <View key={index} style={[styles.savedItem, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="check-circle" size={17} color={colors.safe} /><View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.title}: I’m safe</Text><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{new Date(item.scheduledEndAt ?? item.scheduledStartAt).toLocaleString()} · 10 minute grace</Text></View></View>)}
          <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Optional fixed check-in</Text>
          <Field label="Daily wellness time (optional)" value={dailyCheckTime} onChangeText={setDailyCheckTime} placeholder="21:00" />
          <Field label="Prompt" value={customCheckTitle} onChangeText={setCustomCheckTitle} placeholder="Daily evening check-in" />
          <Field label="Due at" value={customCheckAt} onChangeText={setCustomCheckAt} placeholder="2026-10-04 21:00" />
          <View style={[styles.notice, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "35" }]}><Feather name="lock" size={15} color={colors.warning} /><Text style={{ color: colors.mutedForeground, flex: 1, fontSize: 12, lineHeight: 17 }}>Passports and other encrypted documents are added after the trip is saved, behind device biometrics.</Text></View>
        </>}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {step > 0 ? <TouchableOpacity onPress={() => setStep((value) => value - 1)} style={[styles.back, { borderColor: colors.border }]}><Feather name="arrow-left" size={18} color={colors.foreground} /></TouchableOpacity> : <View style={{ width: 50 }} />}
        {step < 3 ? <TouchableOpacity disabled={!canContinue} onPress={() => setStep((value) => value + 1)} style={[styles.next, { backgroundColor: colors.primary, opacity: canContinue ? 1 : 0.45 }]}><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Continue</Text><Feather name="arrow-right" size={18} color={colors.primaryForeground} /></TouchableOpacity> : <TouchableOpacity disabled={saving || !items.length} onPress={saveTrip} style={[styles.next, { backgroundColor: colors.primary, opacity: saving || !items.length ? 0.45 : 1 }]}>{saving ? <ActivityIndicator color={colors.primaryForeground} /> : <><Feather name="shield" size={18} color={colors.primaryForeground} /><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Save trip</Text></>}</TouchableOpacity>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 }, headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" }, stepCount: { fontSize: 13 }, progress: { height: 3 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 5 }, sectionDesc: { fontSize: 14, lineHeight: 20, marginBottom: 18 }, label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 9 }, optionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" }, contactDraft: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 }, inlineButton: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 10 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }, typeChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 }, savedItem: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 8 }, addItemButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 14, marginTop: 4, marginBottom: 20 },
  notice: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 }, footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 20 }, back: { width: 50, height: 48, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" }, next: { minWidth: 140, height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
});
