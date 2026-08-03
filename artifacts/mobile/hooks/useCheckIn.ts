import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Linking, Platform } from "react-native";

import { type ActiveCheckIn, type TrustedContact, useApp } from "@/context/AppContext";

const genId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleCheckInNotifications(
  nextCheckInAt: Date,
  intervalMinutes: number
): Promise<{ checkInId: string; escalationId: string }> {
  const nowMs = Date.now();
  const checkInMs = nextCheckInAt.getTime();
  const delaySeconds = Math.max(1, Math.round((checkInMs - nowMs) / 1000));
  const escalationDelay = delaySeconds + 5 * 60; // 5 minutes after check-in

  await Notifications.setNotificationCategoryAsync("checkin", [
    {
      identifier: "safe",
      buttonTitle: "I'm Safe",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "sos",
      buttonTitle: "Send SOS",
      options: { opensAppToForeground: true, isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("escalation", [
    {
      identifier: "send_sos",
      buttonTitle: "Send SOS Now",
      options: { opensAppToForeground: true, isDestructive: true },
    },
    {
      identifier: "im_safe",
      buttonTitle: "I'm OK",
      options: { opensAppToForeground: true },
    },
  ]);

  const checkInId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Check-in time",
      body: "Are you safe? Tap to confirm or open the app.",
      categoryIdentifier: "checkin",
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, repeats: false },
  });

  const escalationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Missed check-in",
      body: "No response received. Tap to send an SOS to your trusted contacts.",
      categoryIdentifier: "escalation",
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: escalationDelay, repeats: false },
  });

  return { checkInId, escalationId };
}

export function buildSOSMessage(
  personName: string,
  locationAddress: string,
  mapsUrl?: string
): string {
  const loc = locationAddress
    ? `My last known location: ${locationAddress}${mapsUrl ? ` (${mapsUrl})` : ""}`
    : "";
  return `SAFEDATE ALERT: I may need help. I was on a date with ${personName}. ${loc} Please check on me or call for help.`;
}

export function sendSOSToContacts(
  contacts: TrustedContact[],
  personName: string,
  locationAddress: string,
  mapsUrl?: string
) {
  const message = buildSOSMessage(personName, locationAddress, mapsUrl);
  const phones = contacts
    .map((c) => c.phone)
    .filter(Boolean)
    .join(",");

  if (!phones) return;

  const encoded = encodeURIComponent(message);
  const smsUrl =
    Platform.OS === "ios"
      ? `sms:/open?addresses=${phones}&body=${encoded}`
      : `sms:${phones}?body=${encoded}`;

  Linking.openURL(smsUrl).catch(() => {
    Linking.openURL(`sms:${phones}`);
  });
}

export function useCheckIn() {
  const { activeCheckIn, setActiveCheckIn, updateActiveCheckIn } = useApp();
  const router = useRouter();

  // Handle notification responses
  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const actionId = response.actionIdentifier;
        if (
          actionId === "safe" ||
          actionId === "im_safe" ||
          actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          // Navigate to check-in screen to confirm
          router.push("/checkin");
        } else if (actionId === "sos" || actionId === "send_sos") {
          router.push("/checkin");
        }
      }
    );
    return () => sub.remove();
  }, [router]);

  const startCheckIn = useCallback(
    async (params: {
      personName: string;
      locationName: string;
      intervalMinutes: number;
      trustedContacts: TrustedContact[];
      lastLocation?: ActiveCheckIn["lastLocation"];
    }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const hasPermission = await requestNotificationPermission();
      const now = new Date();
      const nextCheckInAt = new Date(
        now.getTime() + params.intervalMinutes * 60 * 1000
      );

      let checkInNotificationId: string | null = null;
      let escalationNotificationId: string | null = null;

      if (hasPermission) {
        const ids = await scheduleCheckInNotifications(
          nextCheckInAt,
          params.intervalMinutes
        );
        checkInNotificationId = ids.checkInId;
        escalationNotificationId = ids.escalationId;
      }

      const checkIn: ActiveCheckIn = {
        id: genId(),
        personName: params.personName,
        locationName: params.locationName,
        startedAt: now.toISOString(),
        intervalMinutes: params.intervalMinutes,
        nextCheckInAt: nextCheckInAt.toISOString(),
        trustedContacts: params.trustedContacts,
        checkInNotificationId,
        escalationNotificationId,
        missedCheckins: 0,
        lastLocation: params.lastLocation ?? null,
      };

      setActiveCheckIn(checkIn);
    },
    [setActiveCheckIn]
  );

  const confirmSafe = useCallback(async () => {
    if (!activeCheckIn) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Cancel pending escalation
    if (activeCheckIn.escalationNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        activeCheckIn.escalationNotificationId
      ).catch(() => {});
    }
    if (activeCheckIn.checkInNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        activeCheckIn.checkInNotificationId
      ).catch(() => {});
    }

    // Schedule next check-in
    const now = new Date();
    const nextCheckInAt = new Date(
      now.getTime() + activeCheckIn.intervalMinutes * 60 * 1000
    );

    let checkInNotificationId: string | null = null;
    let escalationNotificationId: string | null = null;

    const hasPermission = (await Notifications.getPermissionsAsync()).granted;
    if (hasPermission) {
      const ids = await scheduleCheckInNotifications(
        nextCheckInAt,
        activeCheckIn.intervalMinutes
      );
      checkInNotificationId = ids.checkInId;
      escalationNotificationId = ids.escalationId;
    }

    updateActiveCheckIn({
      nextCheckInAt: nextCheckInAt.toISOString(),
      checkInNotificationId,
      escalationNotificationId,
      missedCheckins: 0,
    });
  }, [activeCheckIn, updateActiveCheckIn]);

  const sendSOS = useCallback(() => {
    if (!activeCheckIn) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    sendSOSToContacts(
      activeCheckIn.trustedContacts,
      activeCheckIn.personName,
      activeCheckIn.lastLocation?.address ?? activeCheckIn.locationName,
      activeCheckIn.lastLocation?.mapsUrl
    );
  }, [activeCheckIn]);

  const endCheckIn = useCallback(async () => {
    if (!activeCheckIn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (activeCheckIn.checkInNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        activeCheckIn.checkInNotificationId
      ).catch(() => {});
    }
    if (activeCheckIn.escalationNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        activeCheckIn.escalationNotificationId
      ).catch(() => {});
    }

    setActiveCheckIn(null);
  }, [activeCheckIn, setActiveCheckIn]);

  return { startCheckIn, confirmSafe, sendSOS, endCheckIn, activeCheckIn };
}
