// Telnyx REST API wrapper (Call Control + Messaging v2).
// Auth: Bearer token via TELNYX_API_KEY env var.
// Voice: Call Control Application (two-leg bridge: ring user → bridge to contact).
// SMS: Telnyx Messaging API.

const API_KEY = process.env.TELNYX_API_KEY;
const BASE = "https://api.telnyx.com/v2";
export const CONNECTION_ID = process.env.TELNYX_APP_ID ?? "";
export const MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID ?? "40019f14-9c79-4aa6-8ac1-4e57db857775";

export function isTelnyxConfigured(): boolean {
  return Boolean(API_KEY);
}

interface TelnyxError extends Error {
  status?: number;
  telnyxCode?: string;
}

async function telnyxRequest(
  path: string,
  opts: { method?: string; json?: Record<string, any>; form?: Record<string, string | undefined> } = {},
): Promise<any> {
  const { method = "GET", json, form } = opts;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  };
  let body: string | undefined;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(form)) {
      if (v != null) p.append(k, String(v));
    }
    body = p.toString();
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const detail = data?.errors?.[0]?.detail ?? data?.errors?.[0]?.title ?? text ?? res.statusText;
    const err: TelnyxError = new Error(`Telnyx ${method} ${path} failed (${res.status}): ${detail}`);
    err.status = res.status;
    err.telnyxCode = data?.errors?.[0]?.code;
    throw err;
  }
  return data?.data ?? data;
}

// ─── Number Management ───────────────────────────────────────────────────────

export interface TelnyxNumber {
  id: string;
  phone_number: string;
  connection_id?: string;
  messaging_profile_id?: string;
  status?: string;
}

export async function listOwnedNumbers(): Promise<TelnyxNumber[]> {
  const data = await telnyxRequest("/phone_numbers?page[size]=50");
  return Array.isArray(data) ? data : [];
}

export async function searchAvailableNumbers(
  areaCode: string,
): Promise<{ phone_number: string }[]> {
  const qs = new URLSearchParams({
    "filter[country_code]": "US",
    "filter[national_destination_code]": areaCode,
    "filter[features][]": "voice",
    "filter[limit]": "5",
  });
  const data = await telnyxRequest(`/available_phone_numbers?${qs}`);
  return Array.isArray(data) ? data.map((n: any) => ({ phone_number: n.phone_number })) : [];
}

export async function buyNumber(args: {
  phoneNumber: string;
  connectionId?: string;
  messagingProfileId?: string;
}): Promise<TelnyxNumber> {
  // Place order
  const order = await telnyxRequest("/phone_number_orders", {
    method: "POST",
    json: { phone_numbers: [{ phone_number: args.phoneNumber }] },
  });
  const bought = order?.phone_numbers?.[0] ?? order;
  const numId: string = bought?.id ?? bought?.phone_number_id ?? "";

  // Assign to Call Control App (voice)
  if (numId && args.connectionId) {
    await telnyxRequest(`/phone_numbers/${encodeURIComponent(numId)}`, {
      method: "PATCH",
      json: { connection_id: args.connectionId },
    }).catch(() => {/* non-fatal */});
  }

  // Assign messaging profile (SMS) — critical for outbound texts
  if (numId && args.messagingProfileId) {
    await telnyxRequest(`/phone_numbers/${encodeURIComponent(numId)}/messaging`, {
      method: "PATCH",
      json: { messaging_profile_id: args.messagingProfileId },
    }).catch(() => {/* non-fatal — number is still usable for voice */});
  }

  return {
    id: numId,
    phone_number: bought?.phone_number ?? args.phoneNumber,
    connection_id: args.connectionId,
    messaging_profile_id: args.messagingProfileId,
  };
}

export async function updateNumberWebhooks(
  numberId: string,
  args: { connectionId?: string },
): Promise<void> {
  if (!numberId || !args.connectionId) return;
  await telnyxRequest(`/phone_numbers/${encodeURIComponent(numberId)}`, {
    method: "PATCH",
    json: { connection_id: args.connectionId },
  });
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export async function sendSms(args: {
  from: string;
  to: string;
  body: string;
  mediaUrl?: string;
  webhookUrl?: string;
}): Promise<{ sid: string; status: string }> {
  const payload: Record<string, any> = {
    from: args.from,
    to: args.to,
    text: args.body || " ",
    type: "SMS",
  };
  if (args.mediaUrl) {
    payload.media_urls = [args.mediaUrl];
    payload.type = "MMS";
  }
  if (args.webhookUrl) {
    payload.webhook_url = args.webhookUrl;
  }
  const data = await telnyxRequest("/messages", { method: "POST", json: payload });
  return { sid: data?.id ?? data?.record_type ?? "unknown", status: data?.to?.[0]?.status ?? "queued" };
}

// ─── Voice / Call Control ─────────────────────────────────────────────────────

export interface CallControlAction {
  call_control_id: string;
}

// Make an outbound call. Returns immediately; handle events via webhook.
export async function createCall(args: {
  connectionId: string;
  from: string;
  to: string;
  clientState?: string; // base64 metadata passed back in every webhook event
  webhookUrl?: string;
}): Promise<{ sid: string; call_control_id: string; status: string }> {
  const payload: Record<string, any> = {
    connection_id: args.connectionId,
    from: args.from,
    to: args.to,
    answering_machine_detection: "disabled",
  };
  if (args.clientState) payload.client_state = args.clientState;
  if (args.webhookUrl) payload.webhook_url = args.webhookUrl;
  const data = await telnyxRequest("/calls", { method: "POST", json: payload });
  return {
    sid: data?.call_leg_id ?? data?.id ?? "unknown",
    call_control_id: data?.call_control_id ?? "",
    status: data?.is_alive ? "ringing" : "initiated",
  };
}

// Speak text on a live call leg.
export async function callSpeak(callControlId: string, text: string, commandId?: string): Promise<void> {
  await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/speak`, {
    method: "POST",
    json: {
      payload: text,
      payload_type: "text",
      voice: "female",
      language: "en-US",
      command_id: commandId,
    },
  });
}

// Bridge two call legs together.
export async function callBridge(callControlIdA: string, callControlIdB: string): Promise<void> {
  await telnyxRequest(`/calls/${encodeURIComponent(callControlIdA)}/actions/bridge`, {
    method: "POST",
    json: { call_control_id: callControlIdB },
  });
}

// Start recording on a call leg.
export async function callRecordStart(callControlId: string, webhookUrl?: string): Promise<void> {
  const payload: Record<string, any> = {
    format: "mp3",
    channels: "dual",
  };
  if (webhookUrl) payload.webhook_url = webhookUrl;
  await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/record_start`, {
    method: "POST",
    json: payload,
  }).catch(() => {/* non-fatal */});
}

// Stop recording.
export async function callRecordStop(callControlId: string): Promise<void> {
  await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/record_stop`, {
    method: "POST",
    json: {},
  }).catch(() => {});
}

// Hang up a call leg.
export async function callHangup(callControlId: string): Promise<void> {
  await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/hangup`, {
    method: "POST",
    json: {},
  }).catch(() => {});
}

// Fetch a recording file from Telnyx.
export async function fetchRecording(
  recordingId: string,
): Promise<{ ok: boolean; status: number; buffer?: Buffer; contentType?: string }> {
  const res = await fetch(`${BASE}/recordings/${encodeURIComponent(recordingId)}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json() as any;
  // Telnyx returns a download URL, not raw bytes
  const downloadUrl = data?.data?.download_urls?.mp3 ?? data?.data?.download_urls?.wav;
  if (!downloadUrl) return { ok: false, status: 404 };
  const mp3Res = await fetch(downloadUrl);
  if (!mp3Res.ok) return { ok: false, status: mp3Res.status };
  const buf = Buffer.from(await mp3Res.arrayBuffer());
  return { ok: true, status: 200, buffer: buf, contentType: "audio/mpeg" };
}
