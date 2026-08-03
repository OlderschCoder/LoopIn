import type { Request } from "express";

export function getPublicBaseUrl(req?: Request): string {
  if (req) {
    const protoHeader = req.headers["x-forwarded-proto"];
    const proto =
      (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)?.split(",")[0]?.trim() ||
      req.protocol ||
      "https";
    const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
    const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader)
      ?.split(",")[0]
      ?.trim();
    if (host) return `${proto}://${host}`;
  }
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  const prod = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (prod) return `https://${prod}`;
  throw new Error("Cannot determine public base URL");
}

const WEBHOOK_SECRET = process.env.TWILIO_WEBHOOK_SECRET ?? "";

export function buildWebhookUrls(req: Request) {
  const base = getPublicBaseUrl(req);
  const k = encodeURIComponent(WEBHOOK_SECRET);
  return {
    // Telnyx routes
    smsUrl: `${base}/api/telnyx/sms-inbound?k=${k}`,
    voiceUrl: `${base}/api/telnyx/call-events?k=${k}`,
    voiceOutboundUrl: `${base}/api/telnyx/call-events?k=${k}`,
    voiceStatusUrl: `${base}/api/telnyx/call-events?k=${k}`,
    recordingStatusUrl: `${base}/api/telnyx/call-events?k=${k}`,
    smsStatusUrl: `${base}/api/telnyx/sms-status?k=${k}`,
  };
}

export function isValidWebhookSecret(provided: unknown): boolean {
  return (
    typeof provided === "string" &&
    WEBHOOK_SECRET.length > 0 &&
    provided === WEBHOOK_SECRET
  );
}
