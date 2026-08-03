import { Router } from "express";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  phoneNumbersTable,
  conversationsTable,
  messagesTable,
  callsTable,
} from "@workspace/db";
import { requireAuth, getUserId } from "../middlewares/requireAuth";
import { buildWebhookUrls } from "../lib/publicUrl";
import {
  isTelnyxConfigured,
  listOwnedNumbers,
  searchAvailableNumbers,
  buyNumber,
  sendSms,
  createCall,
  fetchRecording,
  CONNECTION_ID,
  MESSAGING_PROFILE_ID,
} from "../lib/telnyx";

const router = Router();

const E164 = /^\+[1-9]\d{1,14}$/;

function normalizePhone(input: string): string | null {
  const trimmed = String(input ?? "").trim();
  if (E164.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

async function getUserNumber(userId: string) {
  const rows = await db
    .select()
    .from(phoneNumbersTable)
    .where(eq(phoneNumbersTable.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function ensureConversation(
  userId: string,
  contactNumber: string,
  contactName?: string,
) {
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
  if (existing[0]) {
    if (contactName && !existing[0].contactName) {
      await db
        .update(conversationsTable)
        .set({ contactName })
        .where(eq(conversationsTable.id, existing[0].id));
      existing[0].contactName = contactName;
    }
    return existing[0];
  }
  const id = randomUUID();
  const now = new Date();
  await db.insert(conversationsTable).values({
    id,
    userId,
    contactNumber,
    contactName: contactName ?? null,
    lastMessageAt: now,
    createdAt: now,
  });
  const created = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id))
    .limit(1);
  return created[0];
}

const UPLOADS_DIR = join(process.cwd(), "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Upload media file and return a public URL for MMS.
router.post("/phone/media", requireAuth, async (req, res) => {
  const { base64, mimeType } = req.body as { base64?: string; mimeType?: string };
  if (!base64 || !mimeType) {
    res.status(400).json({ error: "base64 and mimeType are required." });
    return;
  }
  const ext = MIME_EXT[mimeType] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const filePath = join(UPLOADS_DIR, filename);
  try {
    const buf = Buffer.from(base64, "base64");
    writeFileSync(filePath, buf);
    const { getPublicBaseUrl } = await import("../lib/publicUrl.js");
    const base = getPublicBaseUrl(req);
    res.json({ url: `${base}/api/uploads/${filename}` });
  } catch (err) {
    req.log.error({ err }, "Failed to save media upload");
    res.status(500).json({ error: "Failed to save media." });
  }
});

// GET the user's private number (or null if not set up yet).
router.get("/phone/number", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const row = await getUserNumber(userId);
    res.json({ number: row, configured: isTelnyxConfigured() });
  } catch (err) {
    req.log.error({ err }, "Failed to load phone number");
    res.status(500).json({ error: "Failed to load phone number" });
  }
});

// Set up / provision the user's private number.
router.post("/phone/setup", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!isTelnyxConfigured()) {
    res.status(503).json({ error: "Phone service is not configured." });
    return;
  }
  const { areaCode, realPhone } = req.body as {
    areaCode?: string;
    realPhone?: string;
  };

  const normalizedReal = realPhone ? normalizePhone(realPhone) : null;
  if (realPhone && !normalizedReal) {
    res.status(400).json({ error: "Enter a valid phone number." });
    return;
  }

  try {
    const existing = await getUserNumber(userId);

    // Already has a number: just update the real phone.
    if (existing) {
      if (normalizedReal) {
        await db
          .update(phoneNumbersTable)
          .set({ ownerRealPhone: normalizedReal })
          .where(eq(phoneNumbersTable.userId, userId));
      }
      const updated = await getUserNumber(userId);
      res.json({ number: updated });
      return;
    }

    // Find which numbers are already assigned to other users.
    const allAssigned = await db
      .select({ phoneNumber: phoneNumbersTable.phoneNumber })
      .from(phoneNumbersTable);
    const assignedSet = new Set(allAssigned.map((r) => r.phoneNumber));

    const connId = CONNECTION_ID;

    let chosen: { phoneNumber: string; twilioSid: string; areaCode: string | null } | null = null;

    // 1) Try to provision a fresh local number in the requested area code.
    if (areaCode && /^\d{3}$/.test(areaCode)) {
      try {
        const available = await searchAvailableNumbers(areaCode);
        if (available[0]) {
          const bought = await buyNumber({
            phoneNumber: available[0].phone_number,
            connectionId: connId,
            messagingProfileId: MESSAGING_PROFILE_ID,
          });
          chosen = {
            phoneNumber: bought.phone_number,
            twilioSid: bought.id,
            areaCode,
          };
        }
      } catch (err) {
        req.log.warn({ err }, "Could not provision new number; falling back to existing");
      }
    }

    // 2) Fallback: assign an existing owned Telnyx number not already taken.
    if (!chosen) {
      const owned = await listOwnedNumbers();
      const free = owned.find((n) => !assignedSet.has(n.phone_number));
      if (free) {
        const ac = free.phone_number.replace(/^\+1/, "").slice(0, 3);
        chosen = { phoneNumber: free.phone_number, twilioSid: free.id, areaCode: ac };
      }
    }

    if (!chosen) {
      res.status(409).json({
        error: "Could not assign a private number right now. Please try again or contact support.",
      });
      return;
    }

    const inserted = await db
      .insert(phoneNumbersTable)
      .values({
        userId,
        phoneNumber: chosen.phoneNumber,
        twilioSid: chosen.twilioSid,
        areaCode: chosen.areaCode,
        ownerRealPhone: normalizedReal,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ userId: phoneNumbersTable.userId });

    if (inserted.length === 0) {
      const mineNow = await getUserNumber(userId);
      if (mineNow) { res.json({ number: mineNow }); return; }
      res.status(409).json({ error: "That number was just taken. Please try again." });
      return;
    }

    const created = await getUserNumber(userId);
    res.json({ number: created });
  } catch (err) {
    req.log.error({ err }, "Failed to set up phone number");
    res.status(500).json({ error: "Failed to set up phone number." });
  }
});

// List conversations (inbox).
router.get("/phone/conversations", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, userId))
      .orderBy(desc(conversationsTable.lastMessageAt));
    res.json({ conversations: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load conversations");
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// Get one conversation's messages.
router.get("/phone/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = String(req.params.id);
  try {
    const conv = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);
    if (!conv[0]) { res.status(404).json({ error: "Conversation not found" }); return; }
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);
    res.json({ conversation: conv[0], messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to load messages");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// Send an SMS/MMS to a contact from the user's private number.
router.post("/phone/messages", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { to, contactName, body, mediaUrl } = req.body as {
    to?: string;
    contactName?: string;
    body?: string;
    mediaUrl?: string;
  };
  const toNumber = to ? normalizePhone(to) : null;
  if (!toNumber) {
    res.status(400).json({ error: "Enter a valid recipient number." });
    return;
  }
  const msgBody = body ? String(body).trim() : "";
  if (!msgBody && !mediaUrl) {
    res.status(400).json({ error: "Message body or a media attachment is required." });
    return;
  }
  try {
    const mine = await getUserNumber(userId);
    if (!mine) {
      res.status(409).json({ error: "Set up your private number first." });
      return;
    }
    const conv = await ensureConversation(userId, toNumber, contactName);
    const hooks = buildWebhookUrls(req);
    const sent = await sendSms({
      from: mine.phoneNumber,
      to: toNumber,
      body: msgBody || " ",
      mediaUrl,
      webhookUrl: hooks.smsStatusUrl,
    });
    const id = randomUUID();
    const now = new Date();
    await db.insert(messagesTable).values({
      id,
      userId,
      conversationId: conv.id,
      direction: "outbound",
      body: msgBody,
      mediaUrls: mediaUrl ? [mediaUrl] : null,
      twilioSid: sent.sid,
      status: sent.status,
      createdAt: now,
    });
    const preview = mediaUrl && !msgBody ? "📷 Photo" : (msgBody || "📷 Photo").slice(0, 120);
    await db
      .update(conversationsTable)
      .set({ lastMessageAt: now, lastMessagePreview: preview })
      .where(eq(conversationsTable.id, conv.id));
    res.json({ ok: true, messageId: id, conversationId: conv.id, status: sent.status });
  } catch (err: any) {
    req.log.error({ err }, "Failed to send message");
    res.status(502).json({ error: err?.message || "Failed to send message." });
  }
});

// Start a masked outbound call via Telnyx Call Control.
// Rings user's real phone first; on answer, bridges to the contact.
router.post("/phone/call", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { to, contactName } = req.body as { to?: string; contactName?: string };
  const toNumber = to ? normalizePhone(to) : null;
  if (!toNumber) {
    res.status(400).json({ error: "Enter a valid number to call." });
    return;
  }
  try {
    const mine = await getUserNumber(userId);
    if (!mine) {
      res.status(409).json({ error: "Set up your private number first." });
      return;
    }
    if (!mine.ownerRealPhone) {
      res.status(409).json({ error: "Add your real phone number in setup so we can connect the call." });
      return;
    }

    const connId = CONNECTION_ID;
    if (!connId) {
      res.status(503).json({ error: "Voice service not configured (missing TELNYX_APP_ID)." });
      return;
    }

    const hooks = buildWebhookUrls(req);

    // Create call record first so we have an ID for client_state
    const callId = randomUUID();
    await db.insert(callsTable).values({
      id: callId,
      userId,
      contactNumber: toNumber,
      contactName: contactName ?? null,
      direction: "outbound",
      status: "initiated",
      twilioCallSid: "",
      createdAt: new Date(),
    });

    // Encode state so the webhook knows what to do when the user answers
    const clientState = Buffer.from(JSON.stringify({
      type: "outbound_leg_a",
      userId,
      callId,
      from: mine.phoneNumber,   // private number
      to: toNumber,             // contact to bridge to
    })).toString("base64");

    // Ring the user's real phone
    const call = await createCall({
      connectionId: connId,
      from: mine.phoneNumber,
      to: mine.ownerRealPhone,
      clientState,
      webhookUrl: hooks.voiceUrl,
    });

    // Store call control ID
    await db.update(callsTable)
      .set({ status: "ringing", twilioCallSid: call.call_control_id })
      .where(eq(callsTable.id, callId));

    res.json({ ok: true, callId, status: "ringing" });
  } catch (err: any) {
    req.log.error({ err }, "Failed to start call");
    res.status(502).json({ error: err?.message || "Failed to start call." });
  }
});

// Call log.
router.get("/phone/calls", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const rows = await db
      .select()
      .from(callsTable)
      .where(eq(callsTable.userId, userId))
      .orderBy(desc(callsTable.createdAt))
      .limit(200);
    res.json({ calls: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load calls");
    res.status(500).json({ error: "Failed to load calls" });
  }
});

// Stream a call recording.
router.get("/phone/recordings/:callId", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const callId = String(req.params.callId);
  try {
    const rows = await db
      .select()
      .from(callsTable)
      .where(and(eq(callsTable.id, callId), eq(callsTable.userId, userId)))
      .limit(1);
    const call = rows[0];
    if (!call || !call.recordingSid) {
      res.status(404).json({ error: "Recording not found" });
      return;
    }
    const rec = await fetchRecording(call.recordingSid);
    if (!rec.ok || !rec.buffer) {
      res.status(502).json({ error: "Could not fetch recording" });
      return;
    }
    res.setHeader("Content-Type", rec.contentType || "audio/mpeg");
    res.send(rec.buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recording");
    res.status(500).json({ error: "Failed to fetch recording" });
  }
});

export default router;
