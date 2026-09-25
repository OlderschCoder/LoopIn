import { useAuth } from "@clerk/expo";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { AppState, Platform } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  NewTripPayload,
  TripDetail,
  TripSummary,
  TravelContactGroup,
  TravelDocumentType,
  TravelEntitlements,
} from "@/types/travel";

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
const ENV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
export const TRAVEL_API_BASE = (ENV_API_URL && ENV_API_URL !== "undefined"
  ? ENV_API_URL
  : ENV_DOMAIN && ENV_DOMAIN !== "undefined"
    ? `https://${ENV_DOMAIN}`
    : typeof window !== "undefined"
      ? window.location.origin
      : "").replace(/\/$/, "");

interface TravelContextValue {
  entitlements: TravelEntitlements | null;
  trips: TripSummary[];
  contactGroups: TravelContactGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTrip: (id: string) => Promise<TripDetail>;
  createTrip: (payload: NewTripPayload) => Promise<TripDetail>;
  createContactGroup: (name: string, contacts: Array<{ name: string; phone: string; isPrimary: boolean }>) => Promise<TravelContactGroup>;
  confirmCheckpoint: (id: string, location?: { lat?: number; lng?: number; locationLabel?: string }) => Promise<void>;
  refreshItineraryItem: (id: string) => Promise<void>;
  resolveFlight: (args: { ident: string; date: string; origin?: string; destination?: string }) => Promise<any[]>;
  uploadDocument: (tripId: string, file: { uri: string; name: string; mimeType: string }, type: TravelDocumentType, emergencyRelease: boolean) => Promise<void>;
  openDocument: (id: string, mimeType: string) => Promise<void>;
  setDocumentEmergencyRelease: (id: string, enabled: boolean) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  requireBiometric: (reason: string) => Promise<boolean>;
}

const TravelContext = createContext<TravelContextValue | null>(null);

export function TravelProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  const [entitlements, setEntitlements] = useState<TravelEntitlements | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [contactGroups, setContactGroups] = useState<TravelContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`${TRAVEL_API_BASE}/api${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const [tripResult, groups] = await Promise.all([
        api<{ entitlements: TravelEntitlements; trips: TripSummary[] }>("/travel/trips"),
        api<TravelContactGroup[]>("/travel/contact-groups").catch(() => []),
      ]);
      setEntitlements(tripResult.entitlements);
      setTrips(tripResult.trips);
      setContactGroups(groups);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Travel service unavailable");
      try { setEntitlements(await api<TravelEntitlements>("/entitlements")); } catch { /* keep last state */ }
    } finally {
      setLoading(false);
    }
  }, [api, isSignedIn, userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => void refresh(), 60_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [isSignedIn, refresh]);

  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") return;
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        const status = permission.status === "granted" ? permission.status : (await Notifications.requestPermissionsAsync()).status;
        if (status !== "granted") return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        await api("/travel/devices", { method: "POST", body: JSON.stringify({ expoPushToken: token, platform: Platform.OS }) });
      } catch {
        // Push registration can fail on simulators and remains retryable next launch.
      }
    })();
  }, [api, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") return;
    const checkpoint = trips.find((trip) => trip.status === "active" || trip.status === "upcoming")?.nextCheckpoint;
    if (!checkpoint || new Date(checkpoint.dueAt).getTime() - Date.now() > 3 * 60 * 60_000) return;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await api(`/travel/checkpoints/${checkpoint.id}/location`, { method: "POST", body: JSON.stringify({ lat: current.coords.latitude, lng: current.coords.longitude }) });
      } catch {
        // The last confirmed location remains authoritative when location is unavailable.
      }
    })();
  }, [api, isSignedIn, trips]);

  const requireBiometric = useCallback(async (reason: string) => {
    if (Platform.OS === "web") return false;
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Cancel" });
    return result.success;
  }, []);

  const value = useMemo<TravelContextValue>(() => ({
    entitlements,
    trips,
    contactGroups,
    loading,
    error,
    refresh,
    getTrip: (id) => api<TripDetail>(`/travel/trips/${id}`),
    createTrip: async (payload) => {
      const trip = await api<TripDetail>("/travel/trips", { method: "POST", body: JSON.stringify(payload) });
      await refresh();
      return trip;
    },
    createContactGroup: async (name, contacts) => {
      const group = await api<TravelContactGroup>("/travel/contact-groups", { method: "POST", body: JSON.stringify({ name, contacts }) });
      await refresh();
      return group;
    },
    confirmCheckpoint: async (id, location = {}) => {
      await api(`/travel/checkpoints/${id}/confirm`, { method: "POST", body: JSON.stringify(location) });
      await refresh();
    },
    refreshItineraryItem: async (id) => {
      await api(`/travel/items/${id}/refresh`, { method: "POST" });
      await refresh();
    },
    resolveFlight: async (args) => {
      const result = await api<{ flights: any[] }>("/travel/flights/resolve", { method: "POST", body: JSON.stringify(args) });
      return result.flights;
    },
    requireBiometric,
    uploadDocument: async (tripId, file, type, emergencyRelease) => {
      const form = new FormData();
      form.append("type", type);
      form.append("displayName", file.name);
      form.append("emergencyRelease", String(emergencyRelease));
      form.append("document", { uri: file.uri, name: file.name, type: file.mimeType } as any);
      await api(`/travel/trips/${tripId}/documents`, { method: "POST", body: form });
    },
    openDocument: async (id, mimeType) => {
      if (Platform.OS === "web") throw new Error("Encrypted documents are available in the mobile app");
      const allowed = await requireBiometric("Open encrypted travel document");
      if (!allowed) throw new Error("Device biometrics are required to open travel documents");
      const token = await getToken();
      const response = await fetch(`${TRAVEL_API_BASE}/api/travel/documents/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error("Document could not be opened");
      const extension = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1] || "bin";
      const file = new File(Paths.cache, `loopin-travel-${id}.${extension}`);
      try {
        file.write(new Uint8Array(await response.arrayBuffer()));
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType });
      } finally {
        if (file.exists) file.delete();
      }
    },
    setDocumentEmergencyRelease: async (id, enabled) => {
      await api(`/travel/documents/${id}`, { method: "PATCH", body: JSON.stringify({ emergencyRelease: enabled }) });
    },
    deleteDocument: async (id) => {
      await api(`/travel/documents/${id}`, { method: "DELETE" });
    },
  }), [api, contactGroups, entitlements, error, getToken, loading, refresh, requireBiometric, trips]);

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

export function useTravel() {
  const value = useContext(TravelContext);
  if (!value) throw new Error("useTravel must be used within TravelProvider");
  return value;
}
