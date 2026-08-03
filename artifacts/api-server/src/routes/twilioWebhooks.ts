import { Router } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  phoneNumbersTable,
  conversationsTable,
  messagesTable,
  callsTable,
} from "@workspace/db";
import { isValidWebhookSecret, buildWebhookUrls } from "../lib/publicUrl";

const router = Router();

const RECORDING_NOTICE =
  "This call may be recorded for your safety. Connecting you now.";

function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sendTwiml(res: any, xml: string) {
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`);
}

// Gate every webhook on the shared secret token (?k=...). We cannot validate
// Twilio's X-Twilio-Signature because the connector proxy hides the auth token.
router.use("/twilio", (req, res, next) => {
  if (!isValidWebhookSecret(req.query.k)) {
    res.status(403).send("Forbidden");
    return;
  }
  next();
});

async function ownerByNumber(twilioNumber: string, log?: any) {
  const rows = await db
    .select()
    .from(phoneNumbersTable)
    .where(eq(phoneNumbersTable.phoneNumber, twilioNumber))
    .limit(2);
  // The unique constraint should make this impossible, but if a number ever
  // resolves to more than one owner we must NOT guess — that would leak one
  // user's inbound messages/calls to another. Refuse attribution instead.
  if (rows.length > 1) {
    log?.error(
      { twilioNumber },
      "Phone number maps to multiple owners — refusing to attribute inbound traffic",
    );
    return null;
  }
  return rows[0] ?? null;
}

async function ensureConversation(
  userId: string,
  contactNumber: string,
): Promise<string> {
  const existing = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.userId, userId),
        eq(conversationsTable.contactNumber, contactNumber),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0].id;
  const id = randomUUID();
  const now = new Date();
  await db.insert(conversationsTable).values({
    id,
    userId,
    contactNumber,
    lastMessageAt: now,
    createdAt: now,
  });
  return id;
}

// Inbound SMS/MMS from a contact -> capture under the number's owner.
router.post("/twilio/sms-inbound", async (req, res) => {
  try {
    const { From, To, Body, MessageSid, NumMedia } = req.body as Record<string, string>;
    const owner = await ownerByNumber(To, req.log);
    if (owner) {
      const convId = await ensureConversation(owner.userId, From);
      const mediaCount = Number(NumMedia ?? "0") || 0;
      const mediaUrls: string[] = [];
      for (let i = 0; i < mediaCount; i++) {
        const u = (req.body as Record<string, string>)[`MediaUrl${i}`];
        if (u) mediaUrls.push(u);
      }
      const now = new Date();
      await db.insert(messagesTable).values({
        id: randomUUID(),
        userId: owner.userId,
        conversationId: convId,
        direction: "inbound",
        body: Body ?? "",
        mediaUrls: mediaUrls.length ? mediaUrls : null,
        twilioSid: MessageSid,
        status: "received",
        createdAt: now,
      });
      await db
        .update(conversationsTable)
        .set({
          lastMessageAt: now,
          lastMessagePreview: (Body ?? "").slice(0, 120) || "[media]",
        })
        .where(eq(conversationsTable.id, convId));
    } else {
      req.log.warn({ To }, "Inbound SMS for unknown number");
    }
    sendTwiml(res, "");
  } catch (err) {
    req.log.error({ err }, "sms-inbound failed");
    sendTwiml(res, "");
  }
});

// SMS delivery status callback.
router.post("/twilio/sms-status", async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body as Record<string, string>;
    if (MessageSid) {
      await db
        .update(messagesTable)
        .set({ status: MessageStatus })
        .where(eq(messagesTable.twilioSid, MessageSid));
    }
  } catch (err) {
    req.log.error({ err }, "sms-status failed");
  }
  res.sendStatus(204);
});

// Inbound voice call -> consent notice, then forward to the owner's real phone,
// recording the call (dual channel).
router.post("/twilio/voice-inbound", async (req, res) => {
  try {
    const { From, To, CallSid } = req.body as Record<string, string>;
    const owner = await ownerByNumber(To, req.log);
    if (!owner || !owner.ownerRealPhone) {
      sendTwiml(
        res,
        `<Say>Sorry, this number is not available right now. Goodbye.</Say><Hangup/>`,
      );
      return;
    }
    // Log the inbound call so the recording callback can attach to it.
    await db.insert(callsTable).values({
      id: randomUUID(),
      userId: owner.userId,
      contactNumber: From,
      direction: "inbound",
      status: "ringing",
      twilioCallSid: CallSid,
      createdAt: new Date(),
    });
    const hooks = buildWebhookUrls(req);
    sendTwiml(
      res,
      `<Say>${escapeXml(RECORDING_NOTICE)}</Say>` +
        `<Dial callerId="${escapeXml(To)}" record="record-from-answer-dual" ` +
        `recordingStatusCallback="${escapeXml(hooks.recordingStatusUrl)}" ` +
        `recordingStatusCallbackEvent="completed">` +
        `${escapeXml(owner.ownerRealPhone)}</Dial>`,
    );
  } catch (err) {
    req.log.error({ err }, "voice-inbound failed");
    sendTwiml(res, `<Say>An error occurred. Goodbye.</Say><Hangup/>`);
  }
});

// Outbound call leg: after the user's real phone answers, bridge to the contact
// (who sees the private number as caller ID). Recorded with a consent notice.
router.post("/twilio/voice-outbound", async (req, res) => {
  try {
    const callerId = (req.body as Record<string, string>).From; // the private number
    const to = String(req.query.to ?? "");
    if (!to) {
      sendTwiml(res, `<Say>No destination provided. Goodbye.</Say><Hangup/>`);
      return;
    }
    const hooks = buildWebhookUrls(req);
    sendTwiml(
      res,
      `<Say>${escapeXml(RECORDING_NOTICE)}</Say>` +
        `<Dial callerId="${escapeXml(callerId)}" record="record-from-answer-dual" ` +
        `recordingStatusCallback="${escapeXml(hooks.recordingStatusUrl)}" ` +
        `recordingStatusCallbackEvent="completed">` +
        `${escapeXml(to)}</Dial>`,
    );
  } catch (err) {
    req.log.error({ err }, "voice-outbound failed");
    sendTwiml(res, `<Say>An error occurred. Goodbye.</Say><Hangup/>`);
  }
});

// Call status callback (completed) -> store duration/status.
router.post("/twilio/voice-status", async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body as Record<string, string>;
    if (CallSid) {
      await db
        .update(callsTable)
        .set({
          status: CallStatus,
          durationSec: CallDuration ? Number(CallDuration) : undefined,
        })
        .where(eq(callsTable.twilioCallSid, CallSid));
    }
  } catch (err) {
    req.log.error({ err }, "voice-status failed");
  }
  res.sendStatus(204);
});

// Recording status callback -> attach recording to the call row.
router.post("/twilio/recording-status", async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingDuration } = req.body as Record<
      string,
      string
    >;
    if (CallSid && RecordingSid) {
      // Match the most recent call for this CallSid.
      const rows = await db
        .select()
        .from(callsTable)
        .where(eq(callsTable.twilioCallSid, CallSid))
        .orderBy(desc(callsTable.createdAt))
        .limit(1);
      if (rows[0]) {
        await db
          .update(callsTable)
          .set({
            recordingSid: RecordingSid,
            recordingDurationSec: RecordingDuration
              ? Number(RecordingDuration)
              : undefined,
          })
          .where(eq(callsTable.id, rows[0].id));
      }
    }
  } catch (err) {
    req.log.error({ err }, "recording-status failed");
  }
  res.sendStatus(204);
});

export default router;
