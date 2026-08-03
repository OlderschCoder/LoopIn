// Telnyx Call Control + Messaging webhook handlers.
// All routes gated by ?k=TWILIO_WEBHOOK_SECRET query token.
//
// Call Control event flow (outbound):
//   leg-A: call user's real phone  →  call.answered  →  speak notice  →  create leg-B  →  call.answered  →  bridge A+B
// Call Control event flow (inbound):
//   leg-A: contact calls private number  →  call.answered  →  create leg-B (user real phone)  →  call.answered  →  bridge A+B
//
// client_state is base64-encoded JSON we attach when initiating each call leg.

import { Router } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  phoneNumbersTable,
  conversationsTable,
  messagesTable,
  callsTable,
} from "@workspace/db";
import { isValidWebhookSecret, buildWebhookUrls } from "../lib/publicUrl";
import {
  CONNECTION_ID,
  createCall,
  callSpeak,
  callBridge,
  callRecordStart,
  callHangup,
} from "../lib/telnyx";

const router = Router();

const RECORDING_NOTICE = "This call may be recorded for your safety. Connecting you now.";

// ─── Auth gate ────────────────────────────────────────────────────────────────
router.use("/telnyx", (req, res, next) => {
  if (!isValidWebhookSecret(req.query.k)) {
    res.status(403).send("Forbidden");
    return;
  }
  next();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeState(obj: Record<string, any>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function decodeState(s?: string): Record<string, any> {
  if (!s) return {};
  try { return JSON.parse(Buffer.from(s, "base64").toString("utf8")); } catch { return {}; }
}

async function ownerByNumber(privateNumber: string, log?: any) {
  const rows = await db
    .select()
    .from(phoneNumbersTable)
    .where(eq(phoneNumbersTable.phoneNumber, privateNumber))
    .limit(2);
  if (rows.length > 1) {
    log?.error({ privateNumber }, "Number maps to multiple owners");
    return null;
  }
  return rows[0] ?? null;
}

async function ensureConversation(userId: string, contactNumber: string): Promise<string> {
  const existing = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .limit(50);
  const match = existing.find(r => r.contactNumber === contactNumber);
  if (match) return match.id;
  const id = randomUUID();
  const now = new Date();
  await db.insert(conversationsTable).values({
    id, userId, contactNumber, lastMessageAt: now, createdAt: now,
  });
  return id;
}

// ─── Inbound SMS ─────────────────────────────────────────────────────────────
// Telnyx messaging webhooks post JSON with data.event_type = "message.received"
router.post("/telnyx/sms-inbound", async (req, res) => {
  try {
    const body = req.body as any;
    // Support both Telnyx native JSON and form-encoded (TeXML fallback)
    const event = body?.data?.event_type;
    let from: string, to: string, text: string, msgId: string, mediaUrls: string[] = [];

    if (event === "message.received") {
      const payload = body.data.payload;
      from = payload.from?.phone_number ?? payload.from;
      to = payload.to?.[0]?.phone_number ?? payload.to;
      text = payload.text ?? "";
      msgId = payload.id ?? randomUUID();
      mediaUrls = (payload.media ?? []).map((m: any) => m.url).filter(Boolean);
    } else {
      // Form-encoded fallback
      from = body.From ?? "";
      to = body.To ?? "";
      text = body.Body ?? "";
      msgId = body.MessageSid ?? randomUUID();
    }

    if (!to) { res.sendStatus(200); return; }

    const owner = await ownerByNumber(to, req.log);
    if (owner) {
      const convId = await ensureConversation(owner.userId, from);
      const now = new Date();
      await db.insert(messagesTable).values({
        id: randomUUID(),
        userId: owner.userId,
        conversationId: convId,
        direction: "inbound",
        body: text,
        mediaUrls: mediaUrls.length ? mediaUrls : null,
        twilioSid: msgId,
        status: "received",
        createdAt: now,
      });
      await db.update(conversationsTable)
        .set({ lastMessageAt: now, lastMessagePreview: (text || "[media]").slice(0, 120) })
        .where(eq(conversationsTable.id, convId));
    } else {
      req.log.warn({ to }, "Inbound SMS for unknown number");
    }
  } catch (err) {
    req.log.error({ err }, "sms-inbound failed");
  }
  res.sendStatus(200);
});

// SMS delivery status
router.post("/telnyx/sms-status", async (req, res) => {
  try {
    const body = req.body as any;
    const payload = body?.data?.payload;
    const msgId = payload?.id ?? body.MessageSid;
    const status = payload?.to?.[0]?.status ?? body.MessageStatus;
    if (msgId && status) {
      await db.update(messagesTable).set({ status }).where(eq(messagesTable.twilioSid, msgId));
    }
  } catch (err) {
    req.log.error({ err }, "sms-status failed");
  }
  res.sendStatus(200);
});

// ─── Call Control Events (voice) ─────────────────────────────────────────────
// All call events arrive here. We route based on event_type + client_state.
router.post("/telnyx/call-events", async (req, res) => {
  // Always ACK immediately
  res.sendStatus(200);

  try {
    const body = req.body as any;
    const event: string = body?.data?.event_type ?? "";
    const payload = body?.data?.payload ?? {};
    const cid: string = payload.call_control_id ?? "";
    const state = decodeState(payload.client_state);
    const hooks = buildWebhookUrls(req);
    const connId = CONNECTION_ID || process.env.TELNYX_APP_ID || "";

    req.log.info({ event, cid, state }, "Telnyx call event");

    // ── Outbound leg-A: we rang the user's real phone ─────────────────────────
    if (event === "call.answered" && state.type === "outbound_leg_a") {
      // Speak recording notice
      await callSpeak(cid, RECORDING_NOTICE, "notice");
      // Start recording on leg A
      await callRecordStart(cid, `${hooks.recordingStatusUrl}`).catch(() => {});

      // Now dial the contact (leg B)
      const legB = await createCall({
        connectionId: connId,
        from: state.from,       // private number
        to: state.to,           // contact
        clientState: encodeState({ type: "outbound_leg_b", leg_a_cid: cid, userId: state.userId, callId: state.callId }),
        webhookUrl: `${hooks.voiceOutboundUrl}`,
      });

      // Store leg_b cid against the call row
      if (state.callId) {
        await db.update(callsTable)
          .set({ status: "in-progress", twilioCallSid: `${cid}|${legB.call_control_id}` })
          .where(eq(callsTable.id, state.callId));
      }
      return;
    }

    // ── Outbound leg-B: the contact answered ─────────────────────────────────
    if (event === "call.answered" && state.type === "outbound_leg_b") {
      const legACid = state.leg_a_cid;
      if (legACid) {
        await callBridge(legACid, cid);
      }
      return;
    }

    // ── Inbound: contact calling the private number ───────────────────────────
    if (event === "call.answered" && state.type === "inbound_leg_a") {
      await callSpeak(cid, RECORDING_NOTICE, "notice");
      await callRecordStart(cid).catch(() => {});

      const owner = await ownerByNumber(state.privateNumber, req.log);
      if (!owner?.ownerRealPhone) {
        await callHangup(cid);
        return;
      }

      const legB = await createCall({
        connectionId: connId,
        from: state.privateNumber,
        to: owner.ownerRealPhone,
        clientState: encodeState({ type: "inbound_leg_b", leg_a_cid: cid }),
        webhookUrl: `${hooks.voiceOutboundUrl}`,
      });

      // Log call
      await db.insert(callsTable).values({
        id: randomUUID(),
        userId: owner.userId,
        contactNumber: state.from,
        direction: "inbound",
        status: "ringing",
        twilioCallSid: `${cid}|${legB.call_control_id}`,
        createdAt: new Date(),
      }).catch(() => {});
      return;
    }

    // ── Inbound leg-B: user's real phone answered ─────────────────────────────
    if (event === "call.answered" && state.type === "inbound_leg_b") {
      const legACid = state.leg_a_cid;
      if (legACid) await callBridge(legACid, cid);
      return;
    }

    // ── Initial inbound call (call.initiated for inbound) ────────────────────
    if (event === "call.initiated" && payload.direction === "incoming") {
      const to: string = payload.to ?? "";
      const from: string = payload.from ?? "";
      // Answer it
      await fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(cid)}/actions/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_state: encodeState({ type: "inbound_leg_a", privateNumber: to, from }),
        }),
      });
      return;
    }

    // ── Hang-up: update status ────────────────────────────────────────────────
    if (event === "call.hangup") {
      const hangupCause = payload.hangup_cause ?? "completed";
      const sid = cid;
      // Update any call row that includes this cid
      await db.update(callsTable)
        .set({ status: hangupCause === "normal_clearing" ? "completed" : hangupCause })
        .where(eq(callsTable.twilioCallSid, sid))
        .catch(() => {});
      return;
    }

    // ── Recording finished ────────────────────────────────────────────────────
    if (event === "call.recording.saved") {
      const recId = payload.recording_id ?? "";
      const duration = payload.recording_duration_secs ?? 0;
      const legSid = payload.call_leg_id ?? cid;
      if (recId) {
        await db.update(callsTable)
          .set({ recordingSid: recId, recordingDurationSec: duration })
          .where(eq(callsTable.twilioCallSid, legSid))
          .catch(() => {});
      }
      return;
    }

  } catch (err) {
    req.log.error({ err }, "call-events handler failed");
  }
});

// Alias for outbound leg-B webhook (same handler)
router.post("/telnyx/voice-outbound", async (req, res) => {
  req.url = "/telnyx/call-events";
  // Express 5 removed the public `handle` method from the Router type; use an
  // explicit cast to forward the request internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (router as any).handle(req, res, () => {});
});

export default router;
