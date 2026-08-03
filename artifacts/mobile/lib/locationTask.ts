import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

// A single recorded GPS sample. Kept deliberately small (no reverse-geocoded
// address) so the background task stays fast and the synced blob stays compact.
export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp: number;
}

export const SAFEDATE_LOCATION_TASK = "safedate-location-tracking";

// Cap how many points we retain per user so the account blob never grows
// unbounded. ~500 points is plenty of recent history while staying small.
export const MAX_HISTORY_POINTS = 500;

// AsyncStorage keys. History/current are namespaced per user to match
// AppContext's `u:<uid>:<key>` convention; the active-session key tells the
// background task (which has no React context) whose namespace to write to.
const ACTIVE_SESSION_KEY = "safedate:activeLocationSession";
export const historyKeyFor = (uid: string) => `u:${uid}:locationHistory`;
export const currentKeyFor = (uid: string) => `u:${uid}:currentLocation`;

// The active session records WHO is signed in and WHEN they became active.
// `switchedAt` lets the background task reject any location sample captured
// before the current user took over, so a sample queued under the previous
// account can never be misattributed to the new one.
interface ActiveSession {
  uid: string;
  switchedAt: number;
}

async function readActiveSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

export async function setActiveLocationUser(uid: string | null) {
  try {
    if (!uid || uid === "anon") {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      return;
    }
    // Keep the existing `switchedAt` when the same user stays active so we don't
    // discard valid samples every time the lifecycle effect re-runs.
    const current = await readActiveSession();
    if (current?.uid === uid) return;
    const session: ActiveSession = { uid, switchedAt: Date.now() };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // non-fatal — tracking simply won't record until set succeeds
  }
}

async function appendPoints(points: LocationPoint[]) {
  if (points.length === 0) return;
  const session = await readActiveSession();
  // Never record for a signed-out / anonymous session.
  if (!session || !session.uid || session.uid === "anon") return;
  const { uid, switchedAt } = session;

  // Drop any sample captured before this user became active — it belongs to a
  // previous session and must not leak into the current account.
  const owned = points.filter((p) => p.timestamp >= switchedAt);
  if (owned.length === 0) return;

  try {
    const raw = await AsyncStorage.getItem(historyKeyFor(uid));
    const existing: LocationPoint[] = raw ? JSON.parse(raw) : [];
    const merged = [...existing, ...owned];
    const capped =
      merged.length > MAX_HISTORY_POINTS
        ? merged.slice(merged.length - MAX_HISTORY_POINTS)
        : merged;
    await AsyncStorage.setItem(historyKeyFor(uid), JSON.stringify(capped));
    const latest = owned[owned.length - 1];
    await AsyncStorage.setItem(currentKeyFor(uid), JSON.stringify(latest));
  } catch {
    // transient storage error — next update will retry
  }
}

// Define the background task exactly once, and only on native platforms
// (TaskManager is unavailable on web).
if (Platform.OS !== "web" && !TaskManager.isTaskDefined(SAFEDATE_LOCATION_TASK)) {
  TaskManager.defineTask(SAFEDATE_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] })
      ?.locations;
    if (!locations || locations.length === 0) return;
    const points: LocationPoint[] = locations.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      accuracy: l.coords.accuracy,
      timestamp: l.timestamp,
    }));
    await appendPoints(points);
  });
}

// Begin always-on tracking. Safe to call repeatedly. Requires foreground +
// background permission; returns false (without throwing) if anything is
// unavailable so callers can stay quiet on web / denied permission.
export async function startLocationTracking(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") return false;
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== "granted") return false;

    const already = await Location.hasStartedLocationUpdatesAsync(
      SAFEDATE_LOCATION_TASK
    );
    if (already) return true;

    await Location.startLocationUpdatesAsync(SAFEDATE_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 50,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: "LoopIn is protecting you",
        notificationBody:
          "Your location is being saved to your account so your trusted circle can find you.",
        notificationColor: "#7C3AED",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopLocationTracking(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(
      SAFEDATE_LOCATION_TASK
    );
    if (started) await Location.stopLocationUpdatesAsync(SAFEDATE_LOCATION_TASK);
  } catch {
    // already stopped / unavailable
  }
}

// Read a user's stored location data (used by AppContext to mirror what the
// background task has written into state).
export async function readStoredLocation(
  uid: string
): Promise<{ history: LocationPoint[]; current: LocationPoint | null }> {
  try {
    const [h, c] = await AsyncStorage.multiGet([
      historyKeyFor(uid),
      currentKeyFor(uid),
    ]);
    return {
      history: h[1] ? (JSON.parse(h[1]) as LocationPoint[]) : [],
      current: c[1] ? (JSON.parse(c[1]) as LocationPoint) : null,
    };
  } catch {
    return { history: [], current: null };
  }
}

// Merge server history with locally recorded points: union, de-duped by
// timestamp, sorted ascending, capped. Used when pulling the account blob so
// points captured offline aren't lost.
export function mergeHistory(
  a: LocationPoint[] = [],
  b: LocationPoint[] = []
): LocationPoint[] {
  const byTs = new Map<number, LocationPoint>();
  for (const p of [...a, ...b]) {
    if (p && typeof p.timestamp === "number") byTs.set(p.timestamp, p);
  }
  const merged = Array.from(byTs.values()).sort(
    (x, y) => x.timestamp - y.timestamp
  );
  return merged.length > MAX_HISTORY_POINTS
    ? merged.slice(merged.length - MAX_HISTORY_POINTS)
    : merged;
}
