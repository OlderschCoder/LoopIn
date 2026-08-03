import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useMemo, useRef } from "react";

// EXPO_PUBLIC_API_URL must be set at EAS build time, e.g.
//   "https://30ec.spock.replit.dev"   (preview)
//   "https://safedate-ai.replit.app"  (production)
// Fall back to EXPO_PUBLIC_DOMAIN (legacy) then empty string.
const _rawUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");

const BASE_URL = _rawUrl.replace(/\/$/, ""); // strip any trailing slash

export interface PhoneNumberRow {
  userId: string;
  phoneNumber: string;
  twilioSid: string;
  areaCode: string | null;
  ownerRealPhone: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  contactNumber: string;
  contactName: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface PhoneMessage {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  body: string;
  mediaUrls: string[] | null;
  status: string | null;
  createdAt: string;
}

export interface PhoneCall {
  id: string;
  contactNumber: string;
  contactName: string | null;
  direction: "inbound" | "outbound";
  status: string | null;
  durationSec: number | null;
  recordingSid: string | null;
  recordingDurationSec: number | null;
  createdAt: string;
}

// Format an E.164 US number for display, e.g. +18667065127 -> (866) 706-5127.
export function formatPhone(input?: string | null): string {
  if (!input) return "";
  const m = input.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return input;
}

// Normalize any US phone input to E.164 (+1XXXXXXXXXX).
// Returns the original string if it can't be normalized.
// Use this before passing a number as an Expo Router route param —
// parentheses and spaces in the URL break Expo Router's route-group parser.
export function normalizePhone(input?: string | null): string {
  if (!input) return "";
  const s = String(input).trim();
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s; // already E.164
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return s; // return as-is if unrecognizable
}

export function usePhone() {
  const { getToken } = useAuth();

  // Keep getToken in a ref so `authed` and `uploadMedia` never need to be
  // recreated — Clerk frequently changes the getToken reference on auth-state
  // ticks, which would cascade into new `phone` objects → new `load` callbacks
  // → useFocusEffect re-firing → infinite fetch loops.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const authed = useCallback(
    async (path: string, init: RequestInit = {}): Promise<any> => {
      if (!BASE_URL) {
        throw new Error("App is not configured — please contact support.");
      }
      const token = await getTokenRef.current();

      // Abort after 10 s so a bad URL fails fast instead of hanging for 60 s.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/api${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            // Prevent the server from returning 304 Not Modified.
            // React Native's fetch on Android does not restore the cached
            // response body on 304 — the body arrives empty, JSON.parse
            // gets "", returns null, and screens go blank.
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            ...(init.headers ?? {}),
          },
        });
      } catch (err: any) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          throw new Error("Request timed out — check your connection.");
        }
        throw err;
      }
      clearTimeout(timer);

      // 304 has no body — guard before parsing
      if (res.status === 304) {
        throw new Error("Received empty response (304). Please pull to refresh.");
      }

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      return json;
    },
    [], // stable — reads getToken via ref, never recreated
  );

  // Memoize so the returned object is stable across renders — screens depend on
  // these callbacks inside useFocusEffect/useEffect and would otherwise re-run
  // their loads on every render.
  const uploadMedia = useCallback(
    async (base64: string, mimeType: string): Promise<{ url: string }> => {
      const token = await getTokenRef.current();
      const res = await fetch(`${BASE_URL}/api/phone/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ base64, mimeType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
      return json;
    },
    [], // stable — reads getToken via ref
  );

  return useMemo(
    () => ({
      getNumber: (): Promise<{ number: PhoneNumberRow | null; configured: boolean }> =>
        authed("/phone/number"),
      setup: (body: { areaCode?: string; realPhone?: string }): Promise<{ number: PhoneNumberRow }> =>
        authed("/phone/setup", { method: "POST", body: JSON.stringify(body) }),
      listConversations: (): Promise<{ conversations: Conversation[] }> =>
        authed("/phone/conversations"),
      getMessages: (
        id: string,
      ): Promise<{ conversation: Conversation; messages: PhoneMessage[] }> =>
        authed(`/phone/conversations/${id}/messages`),
      sendMessage: (body: {
        to: string;
        contactName?: string;
        body: string;
        mediaUrl?: string;
      }): Promise<{ ok: boolean; messageId: string; conversationId: string; status: string }> =>
        authed("/phone/messages", { method: "POST", body: JSON.stringify(body) }),
      uploadMedia,
      startCall: (body: {
        to: string;
        contactName?: string;
      }): Promise<{ ok: boolean; callId: string; status: string }> =>
        authed("/phone/call", { method: "POST", body: JSON.stringify(body) }),
      listCalls: (): Promise<{ calls: PhoneCall[] }> => authed("/phone/calls"),
    }),
    [authed, uploadMedia],
  );
}
