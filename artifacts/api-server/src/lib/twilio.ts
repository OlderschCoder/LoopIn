// Twilio REST API wrapper.
//
// Auth strategy (in priority order):
//   1. TWILIO_AUTH_TOKEN env var → HTTP Basic Auth (Account SID + Auth Token) to api.twilio.com
//   2. TWILIO_API_KEY + TWILIO_API_KEY_SECRET env vars → HTTP Basic Auth (API Key auth)
//   3. Replit connector proxy (dev only, requires active workspace)
//
// Set TWILIO_AUTH_TOKEN (from your Twilio Console dashboard) as a secret in
// Replit Secrets — that is always the most reliable option for production.
import { ReplitConnectors } from "@replit/connectors-sdk";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;

export function isTwilioConfigured(): boolean {
  return Boolean(ACCOUNT_SID);
}

function buildAuth(): string | null {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken && ACCOUNT_SID) {
    return "Basic " + Buffer.from(`${ACCOUNT_SID}:${authToken}`).toString("base64");
  }
  const apiKey = process.env.TWILIO_API_KEY;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (apiKey && apiKeySecret) {
    return "Basic " + Buffer.from(`${apiKey}:${apiKeySecret}`).toString("base64");
  }
  return null;
}

interface TwilioError extends Error {
  status?: number;
  twilioCode?: number;
}

async function twilioRequest(
  path: string,
  opts: { method?: string; form?: Record<string, string | undefined> } = {},
): Promise<any> {
  const { method = "GET", form } = opts;

  const extraHeaders: Record<string, string> = {};
  let body: string | undefined;
  if (form) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(form)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    extraHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    body = params.toString();
  }

  const auth = buildAuth();
  let res: Response;

  if (auth) {
    // Direct call to api.twilio.com — works in dev and production.
    const url = `https://api.twilio.com${path}`;
    res = await fetch(url, {
      method,
      headers: { ...extraHeaders, Authorization: auth },
      body,
    });
  } else {
    // Fallback: Replit connector proxy (injects credentials automatically).
    const connectors = new ReplitConnectors();
    res = await connectors.proxy("twilio", path, {
      method,
      headers: extraHeaders,
      body,
    } as any);
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const err: TwilioError = new Error(
      `Twilio ${method} ${path} failed (${res.status}): ${json?.message || text || res.statusText}`,
    );
    err.status = res.status;
    err.twilioCode = json?.code;
    throw err;
  }
  return json;
}

export interface TwilioNumber {
  sid: string;
  phone_number: string;
  capabilities?: { sms?: boolean; mms?: boolean; voice?: boolean };
  sms_url?: string;
  voice_url?: string;
}

export async function listOwnedNumbers(): Promise<TwilioNumber[]> {
  const j = await twilioRequest(`/2010-04-01/Accounts/${ACCOUNT_SID}/IncomingPhoneNumbers.json?PageSize=50`);
  return j?.incoming_phone_numbers ?? [];
}

export async function searchAvailableNumbers(
  areaCode: string,
  country = "US",
): Promise<{ phone_number: string }[]> {
  const j = await twilioRequest(
    `/2010-04-01/Accounts/${ACCOUNT_SID}/AvailablePhoneNumbers/${country}/Local.json?AreaCode=${encodeURIComponent(areaCode)}&SmsEnabled=true&VoiceEnabled=true&PageSize=5`,
  );
  return j?.available_phone_numbers ?? [];
}

export async function buyNumber(args: {
  phoneNumber: string;
  smsUrl?: string;
  smsStatusUrl?: string;
  voiceUrl?: string;
  voiceStatusUrl?: string;
}): Promise<TwilioNumber> {
  return twilioRequest(`/2010-04-01/Accounts/${ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
    method: "POST",
    form: {
      PhoneNumber: args.phoneNumber,
      SmsUrl: args.smsUrl,
      SmsMethod: args.smsUrl ? "POST" : undefined,
      StatusCallback: args.smsStatusUrl,
      VoiceUrl: args.voiceUrl,
      VoiceMethod: args.voiceUrl ? "POST" : undefined,
    },
  });
}

export async function updateNumberWebhooks(
  sid: string,
  args: { smsUrl?: string; voiceUrl?: string },
): Promise<TwilioNumber> {
  return twilioRequest(`/2010-04-01/Accounts/${ACCOUNT_SID}/IncomingPhoneNumbers/${sid}.json`, {
    method: "POST",
    form: {
      SmsUrl: args.smsUrl,
      SmsMethod: args.smsUrl ? "POST" : undefined,
      VoiceUrl: args.voiceUrl,
      VoiceMethod: args.voiceUrl ? "POST" : undefined,
    },
  });
}

export async function sendSms(args: {
  from: string;
  to: string;
  body: string;
  mediaUrl?: string;
  statusCallback?: string;
}): Promise<{ sid: string; status: string }> {
  return twilioRequest(`/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    form: {
      From: args.from,
      To: args.to,
      Body: args.body,
      MediaUrl: args.mediaUrl,
      StatusCallback: args.statusCallback,
    },
  });
}

export async function createCall(args: {
  from: string;
  to: string;
  url: string;
  statusCallback?: string;
}): Promise<{ sid: string; status: string }> {
  return twilioRequest(`/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    form: {
      From: args.from,
      To: args.to,
      Url: args.url,
      StatusCallback: args.statusCallback,
      StatusCallbackEvent: args.statusCallback ? "completed" : undefined,
      StatusCallbackMethod: args.statusCallback ? "POST" : undefined,
    },
  });
}

export async function fetchRecording(
  recordingSid: string,
): Promise<{ ok: boolean; status: number; buffer?: Buffer; contentType?: string }> {
  const auth = buildAuth();
  let res: Response;

  if (auth) {
    res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Recordings/${recordingSid}.mp3`,
      { method: "GET", headers: { Authorization: auth } },
    );
  } else {
    const connectors = new ReplitConnectors();
    res = await connectors.proxy(
      "twilio",
      `/2010-04-01/Accounts/${ACCOUNT_SID}/Recordings/${recordingSid}.mp3`,
      { method: "GET" },
    );
  }

  if (!res.ok) return { ok: false, status: res.status };
  const arrayBuf = await res.arrayBuffer();
  return {
    ok: true,
    status: res.status,
    buffer: Buffer.from(arrayBuf),
    contentType: res.headers.get("content-type") || "audio/mpeg",
  };
}
