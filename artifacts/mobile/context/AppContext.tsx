import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { AppState, Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import {
  type LocationPoint,
  mergeHistory,
  readStoredLocation,
  setActiveLocationUser,
  startLocationTracking,
  stopLocationTracking,
} from "@/lib/locationTask";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const ENV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL =
  ENV_DOMAIN && ENV_DOMAIN !== "undefined"
    ? `https://${ENV_DOMAIN}`
    : typeof window !== "undefined"
      ? window.location.origin
      : "";

// Audio recordings are intentionally excluded: their `uri` points at
// device-local files that cannot be resolved on another device, so syncing
// them would only persist dead paths. Recordings stay in per-user local
// storage only.
interface SyncBlob {
  datePlans?: DatePlan[];
  reflections?: Reflection[];
  evidenceItems?: EvidenceItem[];
  trustedContacts?: TrustedContact[];
  matchProfiles?: MatchProfile[];
  settings?: Partial<AppSettings>;
  locationHistory?: LocationPoint[];
  currentLocation?: LocationPoint | null;
}

const LOCAL_KEYS = [
  "datePlans",
  "reflections",
  "evidenceItems",
  "recordings",
  "trustedContacts",
  "matchProfiles",
  "activeCheckIn",
  "fakeCall",
  "settings",
  "locationHistory",
  "currentLocation",
] as const;

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

export type DatingPlatform = "tinder" | "hinge" | "bumble" | "okcupid" | "other";

export interface MatchProfile {
  id: string;
  datePlanId?: string;
  platform: DatingPlatform;
  username: string;
  age?: string;
  bioNotes: string;
  profileDescription: string;
  pastedConversation: string;
  concernsNoted: string;
  photos?: string[];
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatePlan {
  id: string;
  personName: string;
  locationName: string;
  locationType: "public" | "private" | "semi-public";
  transport: "own" | "rideshare" | "walk" | "date-drives" | "public-transit";
  dateTime: string;
  endTime: string;
  trustedContacts: TrustedContact[];
  hasExitPlan: boolean;
  exitPlan: string;
  notes: string;
  safetyScore: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  dateNightMode: boolean;
  createdAt: string;
}

export interface Reflection {
  id: string;
  datePlanId?: string;
  personName: string;
  dateAt: string;
  feelings: string[];
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5;
  wouldSeeAgain: boolean | null;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  content: string;
  type: "note" | "phone" | "screenshot-desc" | "concern";
  personName?: string;
  createdAt: string;
}

export interface DateRecording {
  id: string;
  uri: string;
  label: string;
  personName?: string;
  durationSec: number;
  createdAt: string;
}

export interface ActiveCheckIn {
  id: string;
  personName: string;
  locationName: string;
  startedAt: string;
  intervalMinutes: number;
  nextCheckInAt: string;
  trustedContacts: TrustedContact[];
  checkInNotificationId: string | null;
  escalationNotificationId: string | null;
  missedCheckins: number;
  lastLocation: { lat: number; lng: number; address: string; mapsUrl?: string } | null;
}

export interface FakeCallSetup {
  callerName: string;
  triggerAt: string;
}

export interface AppSettings {
  gpsTrackingEnabled: boolean;
  defaultCheckInIntervalMinutes: number;
  escalationDelayMinutes: number;
  homeAddress: string;
  homeLat: number | null;
  homeLng: number | null;
  appLockEnabled: boolean;
  preferredRideshare: "uber" | "lyft";
  dateNightPin: string | null;
  connectedApps: {
    tinder: boolean;
    hinge: boolean;
    bumble: boolean;
    okcupid: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  gpsTrackingEnabled: true,
  defaultCheckInIntervalMinutes: 30,
  escalationDelayMinutes: 5,
  homeAddress: "",
  homeLat: null,
  homeLng: null,
  appLockEnabled: false,
  preferredRideshare: "uber",
  dateNightPin: null,
  connectedApps: {
    tinder: false,
    hinge: false,
    bumble: false,
    okcupid: false,
  },
};

interface AppContextValue {
  datePlans: DatePlan[];
  reflections: Reflection[];
  evidenceItems: EvidenceItem[];
  recordings: DateRecording[];
  trustedContacts: TrustedContact[];
  matchProfiles: MatchProfile[];
  activeCheckIn: ActiveCheckIn | null;
  fakeCall: FakeCallSetup | null;
  settings: AppSettings;
  locationHistory: LocationPoint[];
  currentLocation: LocationPoint | null;
  addDatePlan: (plan: Omit<DatePlan, "id" | "createdAt">) => void;
  updateDatePlan: (id: string, updates: Partial<DatePlan>) => void;
  deleteDatePlan: (id: string) => void;
  addReflection: (r: Omit<Reflection, "id" | "createdAt">) => void;
  addEvidenceItem: (item: Omit<EvidenceItem, "id" | "createdAt">) => void;
  deleteEvidenceItem: (id: string) => void;
  addRecording: (rec: Omit<DateRecording, "id" | "createdAt">) => void;
  deleteRecording: (id: string) => void;
  addTrustedContact: (contact: Omit<TrustedContact, "id">) => void;
  deleteTrustedContact: (id: string) => void;
  addMatchProfile: (profile: Omit<MatchProfile, "id" | "createdAt" | "updatedAt">) => string;
  updateMatchProfile: (id: string, updates: Partial<MatchProfile>) => void;
  deleteMatchProfile: (id: string) => void;
  setActiveCheckIn: (checkIn: ActiveCheckIn | null) => void;
  updateActiveCheckIn: (updates: Partial<ActiveCheckIn>) => void;
  scheduleFakeCall: (setup: FakeCallSetup) => void;
  clearFakeCall: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const genId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [recordings, setRecordings] = useState<DateRecording[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [matchProfiles, setMatchProfiles] = useState<MatchProfile[]>([]);
  const [activeCheckIn, setActiveCheckInState] = useState<ActiveCheckIn | null>(null);
  const [fakeCall, setFakeCallState] = useState<FakeCallSetup | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);

  // Whether local AsyncStorage has finished hydrating into state.
  const [hydrated, setHydrated] = useState(false);
  // Whether the initial server reconcile (pull/push) for the current user is done.
  // Pushes are gated behind this so we never overwrite the account with stale
  // local data before the first pull resolves.
  const [syncReady, setSyncReady] = useState(false);

  const { isSignedIn, userId, getToken } = useAuth();
  const syncedUserRef = useRef<string | null>(null);

  // AsyncStorage is namespaced per signed-in user so that switching accounts on
  // a shared device never leaks one user's data into another's. `uidRef` always
  // reflects the current owner of the in-memory state.
  const uidRef = useRef<string>("anon");
  uidRef.current = userId ?? "anon";
  const nsKey = useCallback((key: string) => `u:${uidRef.current}:${key}`, []);

  // Build the JSON blob synced to the server (recordings excluded — see above).
  const buildBlob = useCallback(
    (): SyncBlob => ({
      datePlans,
      reflections,
      evidenceItems,
      trustedContacts,
      matchProfiles,
      settings,
      locationHistory,
      currentLocation,
    }),
    [datePlans, reflections, evidenceItems, trustedContacts, matchProfiles, settings, locationHistory, currentLocation]
  );

  const pushBlob = useCallback(
    async (blob: SyncBlob) => {
      const token = await getToken();
      if (!token) return;
      await fetch(`${BASE_URL}/api/user-data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: blob }),
      });
    },
    [getToken]
  );

  // Load this user's data from local storage whenever the signed-in user
  // changes. Resets in-memory state first so a previous user's data never
  // lingers, then performs a one-time migration of any legacy (un-namespaced)
  // data into the first signed-in user's namespace.
  useEffect(() => {
    const uid = userId ?? "anon";
    let cancelled = false;
    setHydrated(false);
    setSyncReady(false);
    (async () => {
      try {
        const nsPairs = await AsyncStorage.multiGet(
          LOCAL_KEYS.map((k) => `u:${uid}:${k}`)
        );
        let map = Object.fromEntries(
          nsPairs.map(([k, v]) => [k.replace(`u:${uid}:`, ""), v])
        ) as Record<string, string | null>;
        const hasNamespaced = nsPairs.some(([, v]) => v != null);

        // One-time legacy adoption: the first signed-in user inherits any
        // pre-accounts local data, then the legacy keys are removed so a
        // second account on the same device starts clean.
        if (!hasNamespaced && uid !== "anon") {
          const legacyPairs = await AsyncStorage.multiGet([...LOCAL_KEYS]);
          const legacyMap = Object.fromEntries(legacyPairs) as Record<
            string,
            string | null
          >;
          const hasLegacy = legacyPairs.some(([, v]) => v != null);
          if (hasLegacy) {
            const toSet = legacyPairs
              .filter(([, v]) => v != null)
              .map(([k, v]) => [`u:${uid}:${k}`, v as string] as [string, string]);
            await AsyncStorage.multiSet(toSet);
            await AsyncStorage.multiRemove([...LOCAL_KEYS]);
            map = legacyMap;
          }
        }

        if (cancelled) return;
        const parse = <T,>(raw: string | null, fallback: T): T =>
          raw ? (JSON.parse(raw) as T) : fallback;
        setDatePlans(parse(map.datePlans, [] as DatePlan[]));
        setReflections(parse(map.reflections, [] as Reflection[]));
        setEvidenceItems(parse(map.evidenceItems, [] as EvidenceItem[]));
        setRecordings(parse(map.recordings, [] as DateRecording[]));
        setTrustedContacts(parse(map.trustedContacts, [] as TrustedContact[]));
        setMatchProfiles(parse(map.matchProfiles, [] as MatchProfile[]));
        setActiveCheckInState(parse(map.activeCheckIn, null as ActiveCheckIn | null));
        setFakeCallState(parse(map.fakeCall, null as FakeCallSetup | null));
        setLocationHistory(parse(map.locationHistory, [] as LocationPoint[]));
        setCurrentLocation(parse(map.currentLocation, null as LocationPoint | null));
        setSettings(
          map.settings
            ? { ...DEFAULT_SETTINGS, ...JSON.parse(map.settings) }
            : DEFAULT_SETTINGS
        );
      } catch {
        // ignore — start from empty state on parse failure
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (key: string, value: unknown) => {
      await AsyncStorage.setItem(nsKey(key), JSON.stringify(value));
    },
    [nsKey]
  );

  const removeKey = useCallback(
    async (key: string) => {
      await AsyncStorage.removeItem(nsKey(key));
    },
    [nsKey]
  );

  // Apply a blob pulled from the server into local state + AsyncStorage.
  const applyBlob = useCallback(
    (data: SyncBlob) => {
      if (Array.isArray(data.datePlans)) {
        setDatePlans(data.datePlans);
        persist("datePlans", data.datePlans);
      }
      if (Array.isArray(data.reflections)) {
        setReflections(data.reflections);
        persist("reflections", data.reflections);
      }
      if (Array.isArray(data.evidenceItems)) {
        setEvidenceItems(data.evidenceItems);
        persist("evidenceItems", data.evidenceItems);
      }
      if (Array.isArray(data.trustedContacts)) {
        setTrustedContacts(data.trustedContacts);
        persist("trustedContacts", data.trustedContacts);
      }
      if (Array.isArray(data.matchProfiles)) {
        setMatchProfiles(data.matchProfiles);
        persist("matchProfiles", data.matchProfiles);
      }
      if (data.settings) {
        const merged = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(merged);
        persist("settings", merged);
      }
      if (Array.isArray(data.locationHistory)) {
        const serverHistory = data.locationHistory;
        setLocationHistory((prev) => {
          const merged = mergeHistory(prev, serverHistory);
          persist("locationHistory", merged);
          return merged;
        });
      }
      if (data.currentLocation) {
        const serverCurrent = data.currentLocation;
        setCurrentLocation((prev) => {
          const next =
            !prev || serverCurrent.timestamp > prev.timestamp
              ? serverCurrent
              : prev;
          persist("currentLocation", next);
          return next;
        });
      }
    },
    [persist]
  );

  // Pull the account blob on sign-in; if the account is empty, seed it with the
  // current on-device data. Runs once per signed-in user. All async results are
  // guarded against an account switch that may happen mid-flight.
  useEffect(() => {
    if (!hydrated) return;
    if (!isSignedIn || !userId) {
      syncedUserRef.current = null;
      setSyncReady(false);
      return;
    }
    if (syncedUserRef.current === userId) return;
    const myUserId = userId;
    syncedUserRef.current = userId;
    setSyncReady(false);
    const stillCurrent = () => syncedUserRef.current === myUserId;
    (async () => {
      try {
        const token = await getToken();
        if (!stillCurrent()) return;
        const res = await fetch(`${BASE_URL}/api/user-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!stillCurrent()) return;
        if (res.ok) {
          const json = (await res.json()) as { data?: SyncBlob };
          if (!stillCurrent()) return;
          const data = json?.data;
          const hasServerData =
            !!data &&
            (["datePlans", "reflections", "evidenceItems", "trustedContacts", "matchProfiles", "locationHistory"].some(
              (k) =>
                Array.isArray((data as Record<string, unknown>)[k]) &&
                ((data as Record<string, unknown[]>)[k]?.length ?? 0) > 0
            ) ||
              !!data.settings);
          if (hasServerData) {
            applyBlob(data);
          } else {
            if (!stillCurrent()) return;
            await pushBlob(buildBlob());
          }
        }
      } catch {
        // offline / transient — local data still works, retry on next change
      } finally {
        if (stillCurrent()) setSyncReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isSignedIn, userId]);

  // Debounced push of the full blob whenever synced data changes.
  useEffect(() => {
    if (!syncReady || !isSignedIn || !userId) return;
    if (syncedUserRef.current !== userId) return;
    const myUserId = userId;
    const blob = buildBlob();
    const t = setTimeout(() => {
      if (syncedUserRef.current !== myUserId) return;
      pushBlob(blob).catch(() => {
        // offline / transient — will push again on next change
      });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    syncReady,
    isSignedIn,
    userId,
    datePlans,
    reflections,
    evidenceItems,
    trustedContacts,
    matchProfiles,
    settings,
    locationHistory,
    currentLocation,
  ]);

  // ── GPS lifecycle ──────────────────────────────────────────────────────────
  // Tell the background task whose namespace to record into, and start/stop
  // always-on tracking based on sign-in + the user's GPS preference. Then keep
  // in-memory state mirrored with what the background task writes to storage
  // (on resume + a light interval) so the UI and server sync stay current.
  useEffect(() => {
    const uid = isSignedIn && userId ? userId : null;
    const shouldTrack = !!uid && settings.gpsTrackingEnabled;
    // Serialize the transition: set/clear the owning session BEFORE starting and
    // AFTER stopping, so the background task always attributes samples correctly.
    (async () => {
      if (shouldTrack) {
        await setActiveLocationUser(uid);
        await startLocationTracking();
      } else {
        await stopLocationTracking();
        if (!uid) await setActiveLocationUser(null);
      }
    })();
  }, [isSignedIn, userId, settings.gpsTrackingEnabled]);

  useEffect(() => {
    if (!isSignedIn || !userId || Platform.OS === "web") return;
    const myUserId = userId;
    let cancelled = false;
    const refresh = async () => {
      const { history, current } = await readStoredLocation(myUserId);
      if (cancelled || uidRef.current !== myUserId) return;
      // Only update state (and thus trigger a server push) when something
      // actually changed — avoids timer-driven PUTs of identical data.
      setLocationHistory((prev) => {
        const prevLast = prev[prev.length - 1]?.timestamp;
        const nextLast = history[history.length - 1]?.timestamp;
        if (prev.length === history.length && prevLast === nextLast) return prev;
        return history;
      });
      setCurrentLocation((prev) =>
        prev?.timestamp === current?.timestamp ? prev : current
      );
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [isSignedIn, userId]);

  const addDatePlan = useCallback(
    (plan: Omit<DatePlan, "id" | "createdAt">) => {
      const newPlan: DatePlan = { ...plan, id: genId(), createdAt: new Date().toISOString() };
      setDatePlans((prev) => {
        const next = [newPlan, ...prev];
        persist("datePlans", next);
        return next;
      });
    },
    [persist]
  );

  const updateDatePlan = useCallback(
    (id: string, updates: Partial<DatePlan>) => {
      setDatePlans((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        persist("datePlans", next);
        return next;
      });
    },
    [persist]
  );

  const deleteDatePlan = useCallback(
    (id: string) => {
      setDatePlans((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persist("datePlans", next);
        return next;
      });
    },
    [persist]
  );

  const addReflection = useCallback(
    (r: Omit<Reflection, "id" | "createdAt">) => {
      const newR: Reflection = { ...r, id: genId(), createdAt: new Date().toISOString() };
      setReflections((prev) => {
        const next = [newR, ...prev];
        persist("reflections", next);
        return next;
      });
    },
    [persist]
  );

  const addEvidenceItem = useCallback(
    (item: Omit<EvidenceItem, "id" | "createdAt">) => {
      const newItem: EvidenceItem = { ...item, id: genId(), createdAt: new Date().toISOString() };
      setEvidenceItems((prev) => {
        const next = [newItem, ...prev];
        persist("evidenceItems", next);
        return next;
      });
    },
    [persist]
  );

  const deleteEvidenceItem = useCallback(
    (id: string) => {
      setEvidenceItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        persist("evidenceItems", next);
        return next;
      });
    },
    [persist]
  );

  const addRecording = useCallback(
    (rec: Omit<DateRecording, "id" | "createdAt">) => {
      const newRec: DateRecording = { ...rec, id: genId(), createdAt: new Date().toISOString() };
      setRecordings((prev) => {
        const next = [newRec, ...prev];
        persist("recordings", next);
        return next;
      });
    },
    [persist]
  );

  const deleteRecording = useCallback(
    (id: string) => {
      setRecordings((prev) => {
        const next = prev.filter((r) => r.id !== id);
        persist("recordings", next);
        return next;
      });
    },
    [persist]
  );

  const addTrustedContact = useCallback(
    (contact: Omit<TrustedContact, "id">) => {
      const newContact: TrustedContact = { ...contact, id: genId() };
      setTrustedContacts((prev) => {
        const next = [...prev, newContact];
        persist("trustedContacts", next);
        return next;
      });
    },
    [persist]
  );

  const deleteTrustedContact = useCallback(
    (id: string) => {
      setTrustedContacts((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist("trustedContacts", next);
        return next;
      });
    },
    [persist]
  );

  const addMatchProfile = useCallback(
    (profile: Omit<MatchProfile, "id" | "createdAt" | "updatedAt">): string => {
      const now = new Date().toISOString();
      const newProfile: MatchProfile = { ...profile, id: genId(), createdAt: now, updatedAt: now };
      setMatchProfiles((prev) => {
        const next = [newProfile, ...prev];
        persist("matchProfiles", next);
        return next;
      });
      return newProfile.id;
    },
    [persist]
  );

  const updateMatchProfile = useCallback(
    (id: string, updates: Partial<MatchProfile>) => {
      setMatchProfiles((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        );
        persist("matchProfiles", next);
        return next;
      });
    },
    [persist]
  );

  const deleteMatchProfile = useCallback(
    (id: string) => {
      setMatchProfiles((prev) => {
        const target = prev.find((p) => p.id === id);
        if (target && Platform.OS !== "web") {
          for (const uri of target.photos ?? []) {
            try {
              const f = new File(uri);
              if (f.exists) f.delete();
            } catch {
              // ignore missing/locked files
            }
          }
        }
        const next = prev.filter((p) => p.id !== id);
        persist("matchProfiles", next);
        return next;
      });
    },
    [persist]
  );

  const setActiveCheckIn = useCallback(
    (checkIn: ActiveCheckIn | null) => {
      setActiveCheckInState(checkIn);
      if (checkIn) persist("activeCheckIn", checkIn);
      else removeKey("activeCheckIn");
    },
    [persist, removeKey]
  );

  const updateActiveCheckIn = useCallback(
    (updates: Partial<ActiveCheckIn>) => {
      setActiveCheckInState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        persist("activeCheckIn", next);
        return next;
      });
    },
    [persist]
  );

  const scheduleFakeCall = useCallback(
    (setup: FakeCallSetup) => {
      setFakeCallState(setup);
      persist("fakeCall", setup);
    },
    [persist]
  );

  const clearFakeCall = useCallback(() => {
    setFakeCallState(null);
    removeKey("fakeCall");
  }, [removeKey]);

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        persist("settings", next);
        return next;
      });
    },
    [persist]
  );

  return (
    <AppContext.Provider
      value={{
        datePlans,
        reflections,
        evidenceItems,
        recordings,
        trustedContacts,
        matchProfiles,
        activeCheckIn,
        fakeCall,
        settings,
        locationHistory,
        currentLocation,
        addDatePlan,
        updateDatePlan,
        deleteDatePlan,
        addReflection,
        addEvidenceItem,
        deleteEvidenceItem,
        addRecording,
        deleteRecording,
        addTrustedContact,
        deleteTrustedContact,
        addMatchProfile,
        updateMatchProfile,
        deleteMatchProfile,
        setActiveCheckIn,
        updateActiveCheckIn,
        scheduleFakeCall,
        clearFakeCall,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
